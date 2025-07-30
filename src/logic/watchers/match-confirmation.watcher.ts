import { Dispatch, useEffect } from 'react';
import { Action, ActionTypes } from '../actions/action.types';
import {
  StepTypes,
  TransactionMatcherState,
  StandardisedTransaction,
} from '../types';
import {
  confirmingMatchedTransactionsStart,
  setCurrentMatchIndex,
  confirmingMatchedTransactionsComplete,
  processingComplete,
} from '../actions/match-confirmation.actions';
import {
  interactiveMatchingStart,
  interactiveMatchingComplete,
} from '../actions/transaction-matching.actions';
import { updatePocketSmithTransaction } from '../services';

const useMatchConfirmationWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const handlePocketSmithUpdate = async (
    transactionId: number,
    payee: string,
    note: string
  ) => {
    try {
      await updatePocketSmithTransaction({
        transactionId,
        payee,
        memo: note,
      });
    } catch (error) {
      console.error('Failed to update PocketSmith transaction:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (
      state.currentStep === StepTypes.TRANSACTION_MATCHING_SUCCESS &&
      state.unmatchedTransactions &&
      state.unmatchedTransactions.length > 0
    ) {
      dispatch(interactiveMatchingStart());
    } else if (
      state.currentStep === StepTypes.TRANSACTION_MATCHING_SUCCESS &&
      (!state.unmatchedTransactions || state.unmatchedTransactions.length === 0) &&
      state.successfullyMatchedTransactions &&
      state.successfullyMatchedTransactions.length > 0 &&
      !state.currentMatchIndex
    ) {
      dispatch(confirmingMatchedTransactionsStart());
      dispatch(setCurrentMatchIndex(0));
    }
  }, [
    state.currentStep,
    state.successfullyMatchedTransactions,
    state.unmatchedTransactions,
    state.currentMatchIndex,
    dispatch,
  ]);

  useEffect(() => {
    if (state.currentStep === StepTypes.CONFIRMING_MATCHED_TRANSACTIONS) {
      const currentTransaction =
        state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0];

      if (
        currentTransaction &&
        state.confirmedMatches &&
        state.confirmedMatches.length > (state.currentMatchIndex || 0) &&
        state.confirmedMatches[state.currentMatchIndex || 0] === currentTransaction
      ) {
        handlePocketSmithUpdate(
          currentTransaction.pocketsmithTransactionId!,
          currentTransaction.Payee,
          currentTransaction.Note
        )
          .then(() => {
            const nextIndex = (state.currentMatchIndex || 0) + 1;
            const totalMatches = state.successfullyMatchedTransactions?.length || 0;

            if (nextIndex >= totalMatches) {
              const confirmedCount = state.confirmedMatches?.length || 0;
              const rejectedCount = state.rejectedMatches?.length || 0;
              const manuallyMatchedCount = state.manuallyMatchedTransactions?.length || 0;
              const totalPocketsmithTransactions = state.pocketsmithTransactions?.length || 0;
              const remainingUnmatched = state.unmatchedTransactions?.length || 0;

              const skippedDuringConfirmation = state.rejectedMatches?.map(rejected => ({
                ...rejected,
                skippedDuringMatching: true,
              })) || [];

              const finalUnmatchedTransactions = [
                ...(state.unmatchedTransactions || []),
                ...skippedDuringConfirmation,
              ];

              dispatch(
                confirmingMatchedTransactionsComplete({
                  totalPocketsmithTransactions,
                  automaticallyMatched: confirmedCount,
                  manuallyMatched: manuallyMatchedCount,
                  skippedDuringConfirmation: rejectedCount,
                  remainingUnmatched: finalUnmatchedTransactions.length,
                  unmatchedTransactions: finalUnmatchedTransactions,
                })
              );

              dispatch(interactiveMatchingComplete());
            } else {
              dispatch(setCurrentMatchIndex(nextIndex));
            }
          })
          .catch(error => {
            console.error('Failed to update PocketSmith transaction:', error);
          });
      } else if (
        state.rejectedMatches &&
        state.rejectedMatches.length > (state.currentMatchIndex || 0) &&
        state.rejectedMatches[state.currentMatchIndex || 0] === currentTransaction
      ) {
        const nextIndex = (state.currentMatchIndex || 0) + 1;
        const totalMatches = state.successfullyMatchedTransactions?.length || 0;

        if (nextIndex >= totalMatches) {
          const confirmedCount = state.confirmedMatches?.length || 0;
          const rejectedCount = state.rejectedMatches?.length || 0;
          const manuallyMatchedCount = state.manuallyMatchedTransactions?.length || 0;
          const totalPocketsmithTransactions = state.pocketsmithTransactions?.length || 0;

          const skippedDuringConfirmation = state.rejectedMatches?.map(rejected => ({
            ...rejected,
            skippedDuringMatching: true,
          })) || [];

          const finalUnmatchedTransactions = [
            ...(state.unmatchedTransactions || []),
            ...skippedDuringConfirmation,
          ];

          dispatch(
            confirmingMatchedTransactionsComplete({
              totalPocketsmithTransactions,
              automaticallyMatched: confirmedCount,
              manuallyMatched: manuallyMatchedCount,
              skippedDuringConfirmation: rejectedCount,
              remainingUnmatched: finalUnmatchedTransactions.length,
              unmatchedTransactions: finalUnmatchedTransactions,
            })
          );

          dispatch(interactiveMatchingComplete());
        } else {
          dispatch(setCurrentMatchIndex(nextIndex));
        }
      }
    }
  }, [
    state.currentStep,
    state.currentMatchIndex,
    state.successfullyMatchedTransactions,
    state.confirmedMatches,
    state.rejectedMatches,
    dispatch,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING_COMPLETE &&
      state.successfullyMatchedTransactions &&
      state.successfullyMatchedTransactions.length > 0
    ) {
      dispatch(confirmingMatchedTransactionsStart());
      dispatch(setCurrentMatchIndex(0));
    } else if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING_COMPLETE &&
      (!state.successfullyMatchedTransactions || state.successfullyMatchedTransactions.length === 0)
    ) {
      dispatch(processingComplete());
    }
  }, [
    state.currentStep,
    state.successfullyMatchedTransactions,
    dispatch,
  ]);
};

export default useMatchConfirmationWatcher;
