import { Dispatch, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState, CSVType } from '../types';
import {
  setCurrentUnmatchedTransaction,
  processManualMatch,
  interactiveMatchingComplete,
} from '../actions/transaction-matching.actions';

const useInteractiveMatchingWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  useEffect(() => {
    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING &&
      !state.waitingForUserInput &&
      !state.waitingForConflictResolution &&
      state.userFoundMatch === false &&
      state.unmatchedTransactions &&
      state.currentUnmatchedIndex !== undefined
    ) {
      const nextIndex = state.currentUnmatchedIndex + 1;

      if (nextIndex < state.unmatchedTransactions.length) {
        dispatch(setCurrentUnmatchedTransaction(nextIndex));
      } else {
        dispatch(interactiveMatchingComplete());
      }
    }
  }, [
    state.currentStep,
    state.waitingForUserInput,
    state.waitingForConflictResolution,
    state.userFoundMatch,
    state.unmatchedTransactions,
    state.currentUnmatchedIndex,
    dispatch,
  ]);

  useEffect(() => {
    const currentTransaction =
      state.unmatchedTransactions?.[state.currentUnmatchedIndex || 0];
    const isAmazonTransaction = currentTransaction?.csvType === CSVType.AMAZON;

    const hasValidPayeeName = isAmazonTransaction || !!state.payeeName;

    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING &&
      !state.waitingForUserInput &&
      !state.waitingForConflictResolution &&
      state.userFoundMatch === true &&
      (state.manualTransactionId || state.manualTransactionIds) &&
      hasValidPayeeName
    ) {
      dispatch(processManualMatch());
    }
  }, [
    state.currentStep,
    state.waitingForUserInput,
    state.waitingForConflictResolution,
    state.userFoundMatch,
    state.manualTransactionId,
    state.manualTransactionIds,
    state.payeeName,
    state.unmatchedTransactions,
    state.currentUnmatchedIndex,
    dispatch,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING &&
      !state.waitingForUserInput &&
      !state.waitingForConflictResolution &&
      state.userFoundMatch === undefined &&
      !state.manualTransactionId &&
      !state.manualTransactionIds &&
      (state.payeeName === undefined || state.payeeName === '') &&
      !state.paypalIdConflict &&
      state.unmatchedTransactions &&
      state.currentUnmatchedIndex !== undefined
    ) {
      const nextIndex = state.currentUnmatchedIndex + 1;

      if (nextIndex < state.unmatchedTransactions.length) {
        dispatch(setCurrentUnmatchedTransaction(nextIndex));
      } else {
        dispatch(interactiveMatchingComplete());
      }
    }
  }, [
    state.currentStep,
    state.waitingForUserInput,
    state.waitingForConflictResolution,
    state.userFoundMatch,
    state.manualTransactionId,
    state.manualTransactionIds,
    state.payeeName,
    state.paypalIdConflict,
    state.unmatchedTransactions,
    state.currentUnmatchedIndex,
    dispatch,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING &&
      state.unmatchedTransactions &&
      state.unmatchedTransactions.length === 0
    ) {
      dispatch(interactiveMatchingComplete());
    }
  }, [state.currentStep, state.unmatchedTransactions, dispatch]);
};

export default useInteractiveMatchingWatcher;
