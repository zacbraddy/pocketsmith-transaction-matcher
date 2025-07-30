import { StandardisedTransaction } from '../types';
import { Action, ActionTypes } from './action.types';

export const csvProcessingStart = (): Action => ({
  type: ActionTypes.CSV_PROCESSING_START,
  payload: null,
});

export const csvProcessingSuccess = (
  transactions: StandardisedTransaction[]
): Action => ({
  type: ActionTypes.CSV_PROCESSING_SUCCESS,
  payload: [...transactions],
});

export const csvProcessingError = (error: string): Action => ({
  type: ActionTypes.CSV_PROCESSING_ERROR,
  payload: error,
});
