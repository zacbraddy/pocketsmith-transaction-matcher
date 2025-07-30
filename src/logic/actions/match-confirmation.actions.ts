import { Action, ActionTypes } from './action.types';
import { StandardisedTransaction } from '../types';

export const confirmingMatchedTransactionsStart = (): Action => ({
  type: ActionTypes.CONFIRMING_MATCHED_TRANSACTIONS_START,
  payload: null,
});

export const setCurrentMatchIndex = (index: number): Action => ({
  type: ActionTypes.SET_CURRENT_MATCH_INDEX,
  payload: index,
});

export const confirmMatch = (): Action => ({
  type: ActionTypes.CONFIRM_MATCH,
  payload: null,
});

export const rejectMatch = (): Action => ({
  type: ActionTypes.REJECT_MATCH,
  payload: null,
});

export const updatePocketsmithTransaction = (
  transactionId: number,
  payee: string,
  note: string
): Action => ({
  type: ActionTypes.UPDATE_POCKETSMITH_TRANSACTION,
  payload: { transactionId, payee, note },
});

export const confirmingMatchedTransactionsComplete = (payload: {
  totalPocketsmithTransactions: number;
  automaticallyMatched: number;
  manuallyMatched: number;
  skippedDuringConfirmation: number;
  remainingUnmatched: number;
  unmatchedTransactions: StandardisedTransaction[];
}): Action => ({
  type: ActionTypes.CONFIRMING_MATCHED_TRANSACTIONS_COMPLETE,
  payload,
});

export const processingComplete = (): Action => ({
  type: ActionTypes.PROCESSING_COMPLETE,
  payload: null,
});
