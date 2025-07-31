import { Dispatch, useCallback, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState } from '../types';
import {
  csvProcessingStart,
  csvProcessingSuccess,
  csvProcessingError,
} from '../actions/csv-processing.actions';
import { processCSVFiles } from '../services';

const useProcessingInputsWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const doCSVProcessing = useCallback(async () => {
    try {
      const standardisedTransactions = await processCSVFiles({
        baseCurrency: 'GBP',
      });

      dispatch(csvProcessingSuccess(standardisedTransactions));
    } catch (error) {
      dispatch(
        csvProcessingError(
          `Error processing CSV files: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }, [dispatch]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.PROCESSING_INPUTS &&
      !state.transactions
    ) {
      dispatch(csvProcessingStart());

      doCSVProcessing();
    }
  }, [state.currentStep, state.transactions, dispatch, doCSVProcessing]);
};

export default useProcessingInputsWatcher;
