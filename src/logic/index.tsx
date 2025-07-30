import { useEffect, useReducer } from 'react';
import transactionMatcherReducer from './reducer';
import { initialisingAction } from './actions/initialising.action';
import useInitialisingWatcher from './watchers/initialising.watcher';
import useProcessingInputsWatcher from './watchers/processing-inputs.watcher';

const useTransactionMatcher = () => {
  const [state, dispatch] = useReducer(transactionMatcherReducer, {});

  useEffect(() => {
    dispatch(initialisingAction());
  }, [dispatch]);

  useInitialisingWatcher(state, dispatch);
  useProcessingInputsWatcher(state, dispatch);

  return { state, dispatch };
};


export default useTransactionMatcher;
