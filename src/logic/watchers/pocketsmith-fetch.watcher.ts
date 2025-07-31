import { Dispatch, useCallback, useEffect } from 'react';
import { Action } from '../actions/action.types';
import { StepTypes, TransactionMatcherState, CSVType } from '../types';
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
      const hasAmazonTransactions = state.transactions?.some(
        t => t.csvType === CSVType.AMAZON
      );

      if (hasAmazonTransactions && !state.selectedTransactionAccountId) {
        console.warn(
          'Cannot fetch Amazon transactions without selected account ID'
        );
        return;
      }

      if (state.currentStep !== StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS) {
        console.warn(
          'fetchPocketSmithTransactions called but not in FETCHING state'
        );
        return;
      }

      if (
        !state.pocketsmithFetchDateRange?.startDate ||
        state.pocketsmithFetchDateRange.startDate === ''
      ) {
        const dateRange = calculateDateRange();
        dispatch(pocketsmithFetchStart(dateRange));
        return;
      }

      const csvType = hasAmazonTransactions ? CSVType.AMAZON : CSVType.PAYPAL;
      const searchTerm = csvType === CSVType.AMAZON ? 'Amazon' : 'Paypal';

      const dateRange = {
        startDate: DateTime.fromISO(state.pocketsmithFetchDateRange!.startDate),
        endDate: DateTime.fromISO(state.pocketsmithFetchDateRange!.endDate),
      };

      const transactions = await fetchUserTransactions({
        dateRange: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
        search: searchTerm,
        uncategorised: true,
        perPage: 1000,
        transactionAccountId: state.selectedTransactionAccountId,
        csvType: csvType,
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
      state.currentStep === StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS &&
      !state.pocketsmithTransactions &&
      !state.pocketsmithFetchError
    ) {
      fetchPocketSmithTransactions();
    }
  }, [
    state.currentStep,
    state.pocketsmithTransactions,
    state.pocketsmithFetchError,
    fetchPocketSmithTransactions,
  ]);
};

export default usePocketSmithFetchWatcher;
