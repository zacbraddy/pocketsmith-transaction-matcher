import { DateTime } from 'luxon';
import {
  StandardisedTransaction,
  PocketSmithTransaction,
  CSVType,
} from '../types';
import { env } from '../../env';

export interface MatchingOptions {
  csvType: CSVType;
}

export interface TransactionMatch {
  csvTransaction: StandardisedTransaction;
  pocketsmithTransaction: PocketSmithTransaction;
  matchScore: number;
  matchReasons: string[];
}

export const matchTransactions = (
  csvTransactions: StandardisedTransaction[],
  pocketsmithTransactions: PocketSmithTransaction[]
): {
  successfulMatches: TransactionMatch[];
  unmatchedCSV: StandardisedTransaction[];
  unmatchedPocketSmith: PocketSmithTransaction[];
} => {
  const successfulMatches: TransactionMatch[] = [];
  const unmatchedCSV: StandardisedTransaction[] = [];
  const usedPocketSmithIds = new Set<number>();

  for (const csvTransaction of csvTransactions) {
    if (
      csvTransaction.csvType === CSVType.AMAZON &&
      csvTransaction.amazonSplitPayments &&
      csvTransaction.amazonSplitPayments.length > 1
    ) {
      const matchesForThisOrder: TransactionMatch[] = [];
      const splitPaymentsMatched = new Set<number>();

      const potentialMatches = findPotentialMatches(
        csvTransaction,
        pocketsmithTransactions
      );

      for (const match of potentialMatches) {
        if (usedPocketSmithIds.has(match.pocketsmithTransaction.id)) continue;

        const psAmount = Math.abs(match.pocketsmithTransaction.amount);

        for (let i = 0; i < csvTransaction.amazonSplitPayments.length; i++) {
          if (splitPaymentsMatched.has(i)) continue;

          const splitAmount = csvTransaction.amazonSplitPayments[i];
          const percentDiff = Math.abs(splitAmount - psAmount) / psAmount;

          if (percentDiff <= env.amountToleranceExact) {
            matchesForThisOrder.push(match);
            splitPaymentsMatched.add(i);
            usedPocketSmithIds.add(match.pocketsmithTransaction.id);
            break;
          }
        }
      }

      if (matchesForThisOrder.length > 0) {
        successfulMatches.push(...matchesForThisOrder);
      } else {
        const totalAmountMatches = potentialMatches.filter(
          match => !usedPocketSmithIds.has(match.pocketsmithTransaction.id)
        );

        if (totalAmountMatches.length > 0) {
          const bestMatch = totalAmountMatches[0];
          successfulMatches.push(bestMatch);
          usedPocketSmithIds.add(bestMatch.pocketsmithTransaction.id);
        } else {
          unmatchedCSV.push(csvTransaction);
        }
      }
    } else {
      const potentialMatches = findPotentialMatches(
        csvTransaction,
        pocketsmithTransactions
      );

      const availableMatches = potentialMatches.filter(
        match => !usedPocketSmithIds.has(match.pocketsmithTransaction.id)
      );

      if (availableMatches.length > 0) {
        const bestMatch = availableMatches[0];
        successfulMatches.push(bestMatch);
        usedPocketSmithIds.add(bestMatch.pocketsmithTransaction.id);
      } else {
        unmatchedCSV.push(csvTransaction);
      }
    }
  }

  const unmatchedPocketSmith = pocketsmithTransactions.filter(
    transaction => !usedPocketSmithIds.has(transaction.id)
  );

  return {
    successfulMatches,
    unmatchedCSV,
    unmatchedPocketSmith,
  };
};

const findPotentialMatches = (
  csvTransaction: StandardisedTransaction,
  pocketsmithTransactions: PocketSmithTransaction[]
): TransactionMatch[] => {
  const potentialMatches: TransactionMatch[] = [];

  for (const psTransaction of pocketsmithTransactions) {
    if (csvTransaction.csvType === CSVType.AMAZON && psTransaction.amount < 0) {
      continue;
    }

    const dateMatch = checkDateMatch(csvTransaction, psTransaction);
    const amountMatch = checkAmountMatch(csvTransaction, psTransaction);

    if (dateMatch.matches && amountMatch.matches) {
      potentialMatches.push({
        csvTransaction,
        pocketsmithTransaction: psTransaction,
        matchScore: 1,
        matchReasons: [dateMatch.reason, amountMatch.reason],
      });
    }
  }

  return potentialMatches;
};

const checkDateMatch = (
  csvTransaction: StandardisedTransaction,
  psTransaction: PocketSmithTransaction
): { matches: boolean; reason: string } => {
  const toleranceDays = env.daysTolerance;
  const csvDate = csvTransaction.Date;
  const psDate = DateTime.fromISO(psTransaction.date);

  if (!psDate.isValid) {
    return { matches: false, reason: 'Invalid PocketSmith date' };
  }

  const daysDiff = Math.abs(csvDate.diff(psDate, 'days').days);

  if (daysDiff <= toleranceDays) {
    return {
      matches: true,
      reason: `Date match within ${daysDiff} day${daysDiff === 1 ? '' : 's'}`,
    };
  }

  return {
    matches: false,
    reason: `Date difference ${daysDiff} days exceeds tolerance of ${toleranceDays} days`,
  };
};

const checkAmountMatch = (
  csvTransaction: StandardisedTransaction,
  psTransaction: PocketSmithTransaction
): { matches: boolean; reason: string } => {
  const tolerancePercent = env.amountToleranceExact;
  const psAmount = Math.abs(psTransaction.amount);

  if (psAmount === 0) {
    return { matches: false, reason: 'PocketSmith amount is zero' };
  }

  if (
    csvTransaction.csvType === CSVType.AMAZON &&
    csvTransaction.amazonSplitPayments &&
    csvTransaction.amazonSplitPayments.length > 1
  ) {
    for (const splitAmount of csvTransaction.amazonSplitPayments) {
      const percentDiff = Math.abs(splitAmount - psAmount) / psAmount;
      if (percentDiff <= tolerancePercent) {
        return {
          matches: true,
          reason: `Amount matches split payment £${splitAmount.toFixed(2)} within ${(percentDiff * 100).toFixed(2)}% tolerance`,
        };
      }
    }

    const csvAmount = Math.abs(csvTransaction.Amount);
    const totalPercentDiff = Math.abs(csvAmount - psAmount) / psAmount;

    if (totalPercentDiff <= tolerancePercent) {
      return {
        matches: true,
        reason: `Amount matches order total £${csvAmount.toFixed(2)} within ${(totalPercentDiff * 100).toFixed(2)}% tolerance (split payment order)`,
      };
    }

    const bestSplitMatch = csvTransaction.amazonSplitPayments.reduce(
      (best, splitAmount) => {
        const percentDiff = Math.abs(splitAmount - psAmount) / psAmount;
        return percentDiff < best.diff
          ? { amount: splitAmount, diff: percentDiff, type: 'split' }
          : best;
      },
      { amount: 0, diff: Infinity, type: 'split' }
    );

    const bestMatch =
      totalPercentDiff < bestSplitMatch.diff
        ? { amount: csvAmount, diff: totalPercentDiff, type: 'total' }
        : bestSplitMatch;

    return {
      matches: false,
      reason: `Amount £${psAmount.toFixed(2)} doesn't match split payments or total. Closest: £${bestMatch.amount.toFixed(2)} (${(bestMatch.diff * 100).toFixed(2)}% difference, ${bestMatch.type})`,
    };
  }

  const csvAmount = Math.abs(csvTransaction.Amount);
  const percentDiff = Math.abs(csvAmount - psAmount) / psAmount;

  if (percentDiff <= tolerancePercent) {
    return {
      matches: true,
      reason: `Amount match within ${(percentDiff * 100).toFixed(2)}% tolerance`,
    };
  }

  return {
    matches: false,
    reason: `Amount difference ${(percentDiff * 100).toFixed(2)}% exceeds tolerance of ${(tolerancePercent * 100).toFixed(2)}%`,
  };
};
