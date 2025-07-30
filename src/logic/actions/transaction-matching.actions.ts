import { Action, ActionTypes } from './action.types';
import { StandardisedTransaction } from '../types';

export const transactionMatchingStart = (): Action => ({
  type: ActionTypes.TRANSACTION_MATCHING_START,
  payload: null,
});

export const transactionMatchingSuccess = (payload: {
  successfullyMatchedTransactions: StandardisedTransaction[];
  unmatchedTransactions: StandardisedTransaction[];
}): Action => ({
  type: ActionTypes.TRANSACTION_MATCHING_SUCCESS,
  payload,
});

export const transactionMatchingError = (errorMessage: string): Action => ({
  type: ActionTypes.TRANSACTION_MATCHING_ERROR,
  payload: errorMessage,
});
