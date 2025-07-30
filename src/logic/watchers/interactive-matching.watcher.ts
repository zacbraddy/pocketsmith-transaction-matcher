import { Dispatch, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState } from '../types';
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
    state.userFoundMatch,
    state.unmatchedTransactions,
    state.currentUnmatchedIndex,
    dispatch,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.INTERACTIVE_MATCHING &&
      !state.waitingForUserInput &&
      state.userFoundMatch === true &&
      state.paypalTransactionNumber &&
      state.payeeName
    ) {
      dispatch(processManualMatch());
    }
  }, [
    state.currentStep,
    state.waitingForUserInput,
    state.userFoundMatch,
    state.paypalTransactionNumber,
    state.payeeName,
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
