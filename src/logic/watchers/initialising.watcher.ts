import { Dispatch, useEffect } from "react";
import { StepTypes, TransactionMatcherState } from "../types";
import { Action } from "../actions/action.types";
import { beginProcessingInputsAction } from "../actions/begin-processing-inputs.action";

const useInitialisingWatcher = (state: TransactionMatcherState, dispatch: Dispatch<Action>) => {
  useEffect(() => {
    if (state.currentStep === StepTypes.INITIALISING) {
      dispatch(beginProcessingInputsAction());
    }
  }, [state.currentStep, dispatch]);
};

export default useInitialisingWatcher;
