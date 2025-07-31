import { Dispatch, useCallback, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState, CSVType } from '../types';
import {
  fetchTransactionAccountsStart,
  fetchTransactionAccountsSuccess,
  fetchTransactionAccountsError,
} from '../actions/transaction-accounts.actions';
import { fetchUserTransactionAccounts } from '../services/pocketsmith-fetch.service';

const useAccountSelectionWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const fetchAccounts = useCallback(async () => {
    try {
      dispatch(fetchTransactionAccountsStart());
      const accounts = await fetchUserTransactionAccounts();
      dispatch(fetchTransactionAccountsSuccess(accounts));
    } catch (error) {
      dispatch(
        fetchTransactionAccountsError(
          error instanceof Error ? error.message : 'Unknown error'
        )
      );
    }
  }, [dispatch]);

  const checkIfAccountSelectionNeeded = useCallback(() => {
    if (state.transactions && state.transactions.length > 0) {
      const hasAmazonTransactions = state.transactions.some(
        t => t.csvType === CSVType.AMAZON
      );

      if (hasAmazonTransactions) {
        fetchAccounts();
      }
    }
  }, [state.transactions, dispatch, fetchAccounts]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.CSV_PROCESSING_SUCCESS &&
      state.transactions &&
      !state.waitingForAccountSelection &&
      !state.availableTransactionAccounts
    ) {
      checkIfAccountSelectionNeeded();
    }
  }, [
    state.currentStep,
    state.transactions,
    state.waitingForAccountSelection,
    state.availableTransactionAccounts,
    checkIfAccountSelectionNeeded,
  ]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.WAITING_FOR_ACCOUNT_SELECTION &&
      !state.availableTransactionAccounts
    ) {
      fetchAccounts();
    }
  }, [state.currentStep, state.availableTransactionAccounts, fetchAccounts]);
};

export default useAccountSelectionWatcher;
