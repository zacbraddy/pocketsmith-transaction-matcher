import { Dispatch, useCallback, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Action } from '../actions/action.types';
import {
  StepTypes,
  TransactionMatcherState,
  CSVType,
  StandardisedTransaction,
} from '../types';
import {
  transactionMatchingStart,
  transactionMatchingSuccess,
  transactionMatchingError,
} from '../actions/transaction-matching.actions';
import {
  matchTransactions,
  TransactionMatch,
} from '../services/transaction-matching.service';

const useTransactionMatchingWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const doTransactionMatching = useCallback(async () => {
    if (!state.pocketsmithTransactions || !state.transactions) {
      return;
    }

    try {
      dispatch(transactionMatchingStart());

      const paypalTransactions = state.transactions.filter(
        t => t.csvType === CSVType.PAYPAL
      );
      const amazonTransactions = state.transactions.filter(
        t => t.csvType === CSVType.AMAZON
      );

      const allSuccessfulMatches: TransactionMatch[] = [];
      const allUnmatchedCSV: StandardisedTransaction[] = [];
      const unmatchedForInteractiveMatching: StandardisedTransaction[] = [];

      if (paypalTransactions.length > 0) {
        const paypalMatches = matchTransactions(
          paypalTransactions,
          state.pocketsmithTransactions
        );

        allSuccessfulMatches.push(...paypalMatches.successfulMatches);
        allUnmatchedCSV.push(...paypalMatches.unmatchedCSV);
      }

      if (amazonTransactions.length > 0) {
        const amazonMatches = matchTransactions(
          amazonTransactions,
          state.pocketsmithTransactions
        );

        allSuccessfulMatches.push(...amazonMatches.successfulMatches);
        allUnmatchedCSV.push(...amazonMatches.unmatchedCSV);

        const unmatchedPocketSmithTransactions =
          amazonMatches.unmatchedPocketSmith.map(psTransaction => {
            const standardised: StandardisedTransaction = {
              Date: DateTime.fromISO(psTransaction.date),
              Amount: psTransaction.amount,
              Payee: psTransaction.payee || 'Unknown',
              Note: `PocketSmith transaction - find matching Amazon order`,
              csvType: CSVType.AMAZON,
              pocketsmithTransactionId: psTransaction.id,
              Labels: [],
            };
            return standardised;
          });

        unmatchedForInteractiveMatching.push(
          ...unmatchedPocketSmithTransactions
        );
      }

      if (paypalTransactions.length > 0) {
        unmatchedForInteractiveMatching.push(
          ...allUnmatchedCSV.filter(t => t.csvType === CSVType.PAYPAL)
        );
      }

      const successfullyMatchedTransactions = allSuccessfulMatches.map(
        match => ({
          ...match.csvTransaction,
          pocketsmithTransactionId: match.pocketsmithTransaction.id,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
        })
      );

      dispatch(
        transactionMatchingSuccess({
          successfullyMatchedTransactions,
          unmatchedTransactions: unmatchedForInteractiveMatching,
        })
      );
    } catch (error) {
      dispatch(
        transactionMatchingError(
          `Error matching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }, [dispatch, state.transactions, state.pocketsmithTransactions]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.POCKETSMITH_FETCH_SUCCESS &&
      state.pocketsmithTransactions &&
      state.transactions &&
      !state.successfullyMatchedTransactions
    ) {
      doTransactionMatching();
    }
  }, [
    state.currentStep,
    state.pocketsmithTransactions,
    state.transactions,
    state.successfullyMatchedTransactions,
    doTransactionMatching,
  ]);
};

export default useTransactionMatchingWatcher;
