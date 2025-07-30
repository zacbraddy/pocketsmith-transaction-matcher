import { Dispatch, useEffect } from "react";
import { Action } from "../actions/action.types";
import { StepTypes, TransactionMatcherState, PocketSmithTransaction, StandardisedTransaction } from "../types";
import { pocketsmithFetchStart, pocketsmithFetchSuccess, pocketsmithFetchError } from "../actions/pocketsmith-fetch.actions";
import { DateTime } from "luxon";
import { createPocketSmithClient } from "pocketsmith-ts";
import { env } from "@/env";

const usePocketSmithFetchWatcher = (state: TransactionMatcherState, dispatch: Dispatch<Action>) => {
  const calculateDateRange = () => {
    if (!state.transactions || state.transactions.length === 0) {
      throw new Error("No CSV transactions available to calculate date range");
    }

    const transactionDates = state.transactions.map(transaction => transaction.Date);

    const earliestDate = DateTime.min(...transactionDates);
    const latestDate = DateTime.max(...transactionDates);

    const startDate = earliestDate?.minus({ day: 5 });
    const endDate = latestDate?.plus({ day: 5 });
    const today = DateTime.now();

    const finalEndDate = endDate && endDate > today ? today : endDate;


    return {
      startDate: startDate,
      endDate: finalEndDate
    };
  };

  const fetchPocketSmithTransactions = async () => {
    try {
      const dateRange = calculateDateRange();
      dispatch(pocketsmithFetchStart(dateRange));

      const client = createPocketSmithClient({
        apiKey: env.pocketsmithApiKey,
        baseUrl: env.pocketsmithBaseUrl
      });

      const { data: user, error: userError } = await client.GET('/me');

      if (userError) {
        throw new Error(`Failed to fetch user: ${JSON.stringify(userError)}`);
      }

      const userId = user.id;

      const { data: rawTransactions, error: transactionsError } = await client.GET('/users/{id}/transactions', {
        params: {
          path: { id: userId },
          query: {
            start_date: dateRange.startDate?.toFormat("yyyy-MM-dd"),
            end_date: dateRange.endDate?.toFormat("yyyy-MM-dd"),
            uncategorised: 1,
            search: 'Paypal',
            per_page: 1000,
          }
        }
      });

      if (transactionsError) {
        throw new Error(`Failed to fetch transactions: ${JSON.stringify(transactionsError)}`);
      }

      if (!rawTransactions || rawTransactions.length === 0) {
        throw new Error("No transactions found in PocketSmith");
      }

      const allTransactions: PocketSmithTransaction[] = [];

      if (rawTransactions && rawTransactions.length > 0) {
        const mappedTransactions = rawTransactions
          .filter(transaction => transaction.payee?.toLowerCase().includes('paypal'))
          .map(transaction => ({
            id: transaction.id || 0,
            payee: transaction.payee || '',
            amount: transaction.amount || 0,
            date: transaction.date || '',
            memo: transaction.memo || '',
            labels: transaction.labels || [],
            account_id: transaction.transaction_account?.id || 0,
            category_id: transaction.category?.id || 0,
            needs_review: transaction.needs_review || false
          }));

        allTransactions.push(...mappedTransactions);
      }

      const standardisedTransactions: StandardisedTransaction[] = allTransactions.map(transaction => ({
        Date: DateTime.fromISO(transaction.date),
        Note: transaction.memo,
        Amount: transaction.amount,
        Payee: transaction.payee,
        Labels: transaction.labels || [],
      }));

      dispatch(pocketsmithFetchSuccess(standardisedTransactions));
    } catch (error) {
      dispatch(pocketsmithFetchError(`Error fetching PocketSmith transactions: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  };

  useEffect(() => {
    if (state.currentStep === StepTypes.CSV_PROCESSING_SUCCESS && !state.pocketsmithTransactions) {
      fetchPocketSmithTransactions();
    }
  }, [state.currentStep, state.transactions, state.pocketsmithTransactions, dispatch]);
};

export default usePocketSmithFetchWatcher;
