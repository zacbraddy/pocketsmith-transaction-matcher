import { Action } from './action.types';
import { ActionTypes } from './action.types';

export const beginProcessingInputsAction = (): Action => ({
  type: ActionTypes.BEGIN_PROCESSING_INPUTS,
  payload: undefined,
});
