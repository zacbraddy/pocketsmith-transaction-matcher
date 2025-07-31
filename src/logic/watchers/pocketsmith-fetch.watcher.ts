import { Dispatch, useCallback, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState } from '../types';
import {
  pocketsmithFetchStart,
  pocketsmithFetchSuccess,
  pocketsmithFetchError,
} from '../actions/pocketsmith-fetch.actions';
import { DateTime } from 'luxon';
import { env } from '@/env';
import { fetchUserTransactions } from '../services';

const usePocketSmithFetchWatcher = (
  state: TransactionMatcherState,
  dispatch: Dispatch<Action>
) => {
  const calculateDateRange = useCallback(() => {
    if (!state.transactions || state.transactions.length === 0) {
      throw new Error('No CSV transactions available to calculate date range');
    }

    const transactionDates = state.transactions.map(
      transaction => transaction.Date
    );

    const earliestDate = DateTime.min(...transactionDates);
    const latestDate = DateTime.max(...transactionDates);

    const startDate = earliestDate?.minus({ day: env.dateRangeBufferDays });
    const endDate = latestDate?.plus({ day: env.dateRangeBufferDays });
    const today = DateTime.now();

    const finalEndDate = endDate && endDate > today ? today : endDate;

    return {
      startDate: startDate,
      endDate: finalEndDate,
    };
  }, [state]);

  const fetchPocketSmithTransactions = useCallback(async () => {
    try {
      const dateRange = calculateDateRange();
      dispatch(pocketsmithFetchStart(dateRange));

      const transactions = await fetchUserTransactions({
        dateRange: {
          startDate: dateRange.startDate!,
          endDate: dateRange.endDate!,
        },
        search: 'Paypal',
        uncategorised: true,
        perPage: 1000,
      });

      dispatch(pocketsmithFetchSuccess(transactions));
    } catch (error) {
      dispatch(
        pocketsmithFetchError(
          `Error fetching PocketSmith transactions: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
    }
  }, [dispatch, calculateDateRange]);

  useEffect(() => {
    if (
      state.currentStep === StepTypes.CSV_PROCESSING_SUCCESS &&
      !state.pocketsmithTransactions
    ) {
      fetchPocketSmithTransactions();
    }
  }, [
    state.currentStep,
    state.transactions,
    state.pocketsmithTransactions,
    dispatch,
    fetchPocketSmithTransactions,
  ]);
};

export default usePocketSmithFetchWatcher;
