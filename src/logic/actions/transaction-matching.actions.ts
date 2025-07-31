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

export const interactiveMatchingStart = (): Action => ({
  type: ActionTypes.INTERACTIVE_MATCHING_START,
  payload: null,
});

export const setCurrentUnmatchedTransaction = (index: number): Action => ({
  type: ActionTypes.SET_CURRENT_UNMATCHED_TRANSACTION,
  payload: index,
});

export const userResponseFoundMatch = (): Action => ({
  type: ActionTypes.USER_RESPONSE_FOUND_MATCH,
  payload: null,
});

export const userResponseNoMatch = (): Action => ({
  type: ActionTypes.USER_RESPONSE_NO_MATCH,
  payload: null,
});

export const setManualMatchDetails = (payload: {
  transactionId: string;
  payeeName: string;
}): Action => ({
  type: ActionTypes.SET_MANUAL_MATCH_DETAILS,
  payload,
});

export const setManualMultiMatchDetails = (payload: {
  transactionIds: string[];
  payeeName: string;
}): Action => ({
  type: ActionTypes.SET_MANUAL_MULTI_MATCH_DETAILS,
  payload,
});

export const processManualMatch = (): Action => ({
  type: ActionTypes.PROCESS_MANUAL_MATCH,
  payload: null,
});

export const paypalIdConflictDetected = (payload: {
  paypalId: string;
  existingTransaction: StandardisedTransaction;
  currentTransaction: StandardisedTransaction;
}): Action => ({
  type: ActionTypes.PAYPAL_ID_CONFLICT_DETECTED,
  payload,
});

export const resolvePaypalIdConflict = (payload: {
  keepExisting: boolean;
}): Action => ({
  type: ActionTypes.RESOLVE_PAYPAL_ID_CONFLICT,
  payload,
});

export const interactiveMatchingComplete = (): Action => ({
  type: ActionTypes.INTERACTIVE_MATCHING_COMPLETE,
  payload: null,
});
