import { useEffect, useReducer } from 'react';
import transactionMatcherReducer from './reducer';
import { StepTypes } from './types';
import { initialisingAction } from './actions/initialising.action';
import useInitialisingWatcher from './watchers/initialising.watcher';
import useProcessingInputsWatcher from './watchers/processing-inputs.watcher';
import usePocketSmithFetchWatcher from './watchers/pocketsmith-fetch.watcher';
import useTransactionMatchingWatcher from './watchers/transaction-matching.watcher';
import useInteractiveMatchingWatcher from './watchers/interactive-matching.watcher';
import useMatchConfirmationWatcher from './watchers/match-confirmation.watcher';

const useTransactionMatcher = () => {
  const [state, dispatch] = useReducer(transactionMatcherReducer, {
    currentStep: StepTypes.INITIALISING,
  });

  useEffect(() => {
    dispatch(initialisingAction());
  }, [dispatch]);

  useInitialisingWatcher(state, dispatch);
  useProcessingInputsWatcher(state, dispatch);
  usePocketSmithFetchWatcher(state, dispatch);
  useTransactionMatchingWatcher(state, dispatch);
  useInteractiveMatchingWatcher(state, dispatch);
  useMatchConfirmationWatcher(state, dispatch);

  return { state, dispatch };
};

export default useTransactionMatcher;
