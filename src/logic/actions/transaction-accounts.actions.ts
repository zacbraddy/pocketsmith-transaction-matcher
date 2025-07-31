import { Action, ActionTypes } from './action.types';
import { TransactionAccount } from '../types';

export const fetchTransactionAccountsStart = (): Action => ({
  type: ActionTypes.FETCH_TRANSACTION_ACCOUNTS,
  payload: {},
});

export const fetchTransactionAccountsSuccess = (
  accounts: TransactionAccount[]
): Action => ({
  type: ActionTypes.FETCH_TRANSACTION_ACCOUNTS_SUCCESS,
  payload: { accounts },
});

export const fetchTransactionAccountsError = (error: string): Action => ({
  type: ActionTypes.FETCH_TRANSACTION_ACCOUNTS_ERROR,
  payload: { error },
});

export const selectTransactionAccountAction = (
  accountId: number | null
): Action => ({
  type: ActionTypes.SELECT_TRANSACTION_ACCOUNT,
  payload: { accountId },
});

export const skipAccountSelectionAction = (): Action => ({
  type: ActionTypes.SKIP_ACCOUNT_SELECTION,
  payload: {},
});
