import { Dispatch, useEffect } from 'react';
import { Action } from '../actions/action.types';
import {
  StepTypes,
  TransactionMatcherState,
  StandardisedTransaction,
} from '../types';
import {
  transactionMatchingStart,
  transactionMatchingSuccess,
  transactionMatchingError,
  interactiveMatchingStart,
} from '../actions/transaction-matching.actions';
import { DateTime } from 'luxon';
import { env } from '@/env';

const useTransactionMatchingWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const isWithinBusinessDays = (date1: DateTime, date2: DateTime): boolean => {
    const daysDiff = Math.abs(date1.diff(date2, 'days').days);

    if (daysDiff <= env.daysTolerance) {
      return true;
    }

    let earlierDate = date1 < date2 ? date1 : date2;
    let laterDate = date1 < date2 ? date2 : date1;
    let businessDaysCount = 0;
    let currentDate = earlierDate;

    while (currentDate < laterDate && businessDaysCount <= 1) {
      const dayOfWeek = currentDate.weekday;
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        businessDaysCount++;
      }
      currentDate = currentDate.plus({ day: 1 });
    }

    return businessDaysCount <= env.daysTolerance;
  };

  const isAmountMatch = (
    pocketsmithAmount: number,
    paypalAmount: number,
    isForeignCurrency: boolean
  ): boolean => {
    if (!isForeignCurrency) {
      return (
        Math.abs(pocketsmithAmount - paypalAmount) < env.amountToleranceExact
      );
    }

    const allowedVariance =
      Math.abs(pocketsmithAmount) * env.amountToleranceForeignPercent;
    return Math.abs(pocketsmithAmount - paypalAmount) <= allowedVariance;
  };

  const matchTransactions = () => {
    try {
      dispatch(transactionMatchingStart());

      if (!state.pocketsmithTransactions || !state.transactions) {
        throw new Error('Missing transaction data for matching');
      }

      const pocketsmithTransactions = state.pocketsmithTransactions;
      const paypalTransactions = state.transactions;

      const potentialMatches = new Map<number, string[]>();

      for (const pocketsmithTx of pocketsmithTransactions) {
        const pocketsmithDate = DateTime.fromISO(pocketsmithTx.date);
        const matchingPaypalIds: string[] = [];

        for (const paypalTx of paypalTransactions) {
          if (!paypalTx.paypalTransactionId) continue;

          const isDateMatch = isWithinBusinessDays(
            pocketsmithDate,
            paypalTx.Date
          );
          const isValueMatch = isAmountMatch(
            pocketsmithTx.amount,
            paypalTx.Amount,
            paypalTx.isForeignCurrency || false
          );

          if (isDateMatch && isValueMatch) {
            matchingPaypalIds.push(paypalTx.paypalTransactionId);
          }
        }

        if (matchingPaypalIds.length > 0) {
          potentialMatches.set(pocketsmithTx.id, matchingPaypalIds);
        }
      }

      const usedPaypalIds = new Set<string>();
      const successfullyMatchedTransactions: StandardisedTransaction[] = [];
      const unmatchedPocketsmithIds = new Set<number>();

      while (potentialMatches.size > 0) {
        let matchMade = false;

        for (const [pocketsmithId, paypalIds] of potentialMatches.entries()) {
          const availablePaypalIds = paypalIds.filter(
            id => !usedPaypalIds.has(id)
          );

          if (availablePaypalIds.length > 0) {
            const selectedPaypalId = availablePaypalIds[0];

            const paypalTransaction = paypalTransactions.find(
              tx => tx.paypalTransactionId === selectedPaypalId
            );

            if (paypalTransaction) {
              const matchedTransaction: StandardisedTransaction = {
                ...paypalTransaction,
                pocketsmithTransactionId: pocketsmithId,
              };

              successfullyMatchedTransactions.push(matchedTransaction);
              usedPaypalIds.add(selectedPaypalId);
              matchMade = true;
            }
          }

          potentialMatches.delete(pocketsmithId);
        }

        for (const [pocketsmithId, paypalIds] of potentialMatches.entries()) {
          const availablePaypalIds = paypalIds.filter(
            id => !usedPaypalIds.has(id)
          );

          if (availablePaypalIds.length === 0) {
            unmatchedPocketsmithIds.add(pocketsmithId);
            potentialMatches.delete(pocketsmithId);
          } else {
            potentialMatches.set(pocketsmithId, availablePaypalIds);
          }
        }

        if (!matchMade && potentialMatches.size > 0) {
          for (const pocketsmithId of potentialMatches.keys()) {
            unmatchedPocketsmithIds.add(pocketsmithId);
          }
          break;
        }
      }

      const unmatchedTransactions: StandardisedTransaction[] =
        pocketsmithTransactions
          .filter(
            psTx =>
              !successfullyMatchedTransactions.some(
                matched => matched.pocketsmithTransactionId === psTx.id
              )
          )
          .map(psTx => ({
            Date: DateTime.fromISO(psTx.date),
            Note: psTx.memo,
            Amount: psTx.amount,
            Payee: psTx.payee,
            Labels: psTx.labels || [],
            pocketsmithTransactionId: psTx.id,
          }));

      dispatch(
        transactionMatchingSuccess({
          successfullyMatchedTransactions,
          unmatchedTransactions,
        })
      );
    } catch (error) {
      dispatch(
        transactionMatchingError(
          `Error matching transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  };

  useEffect(() => {
    if (
      state.currentStep === StepTypes.POCKETSMITH_FETCH_SUCCESS &&
      state.pocketsmithTransactions &&
      state.transactions &&
      !state.successfullyMatchedTransactions
    ) {
      matchTransactions();
    }
  }, [
    state.currentStep,
    state.pocketsmithTransactions,
    state.transactions,
    state.successfullyMatchedTransactions,
    dispatch,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.TRANSACTION_MATCHING_SUCCESS &&
      state.unmatchedTransactions &&
      state.unmatchedTransactions.length > 0
    ) {
      dispatch(interactiveMatchingStart());
    }
  }, [state.currentStep, state.unmatchedTransactions, dispatch]);
};

export default useTransactionMatchingWatcher;
