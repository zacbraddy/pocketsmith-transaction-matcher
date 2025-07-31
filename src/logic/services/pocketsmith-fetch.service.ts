import { createPocketSmithClient } from 'pocketsmith-ts';
import { env } from '@/env';
import { DateTime } from 'luxon';
import { PocketSmithTransaction } from '../types';

export interface DateRange {
  startDate: DateTime;
  endDate: DateTime;
}

export interface FetchTransactionsParams {
  dateRange: DateRange;
  search?: string;
  uncategorised?: boolean;
  perPage?: number;
}

export interface PocketSmithUser {
  id: number;
  email: string;
  name: string;
}

export const fetchCurrentUser = async (): Promise<PocketSmithUser> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const { data: user, error: userError } = await client.GET('/me');

  if (userError) {
    throw new Error(`Failed to fetch user: ${JSON.stringify(userError)}`);
  }

  if (!user) {
    throw new Error('No user data returned from PocketSmith API');
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.name || '',
  };
};

export const fetchUserTransactions = async ({
  dateRange,
  search = 'Paypal',
  uncategorised = true,
  perPage = 1000,
}: FetchTransactionsParams): Promise<PocketSmithTransaction[]> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const user = await fetchCurrentUser();

  const { data: rawTransactions, error: transactionsError } = await client.GET(
    '/users/{id}/transactions',
    {
      params: {
        path: { id: user.id },
        query: {
          start_date: dateRange.startDate.toFormat('yyyy-MM-dd'),
          end_date: dateRange.endDate.toFormat('yyyy-MM-dd'),
          uncategorised: uncategorised ? 1 : 0,
          search,
          per_page: perPage,
        },
      },
    }
  );

  if (transactionsError) {
    throw new Error(
      `Failed to fetch transactions: ${JSON.stringify(transactionsError)}`
    );
  }

  if (!rawTransactions || rawTransactions.length === 0) {
    throw new Error('No transactions found in PocketSmith');
  }

  const filteredTransactions = rawTransactions
    .filter(transaction => {
      const matchesPayee = transaction.payee
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const hasNoMemo = !transaction.memo || transaction.memo.trim() === '';
      const hasNoLabels =
        !transaction.labels || transaction.labels.length === 0;

      return matchesPayee && hasNoMemo && hasNoLabels;
    })
    .map(transaction => ({
      id: transaction.id || 0,
      payee: transaction.payee || '',
      amount: transaction.amount || 0,
      date: transaction.date || '',
      memo: transaction.memo || '',
      labels: transaction.labels || [],
      account_id: transaction.transaction_account?.id || 0,
      category_id: transaction.category?.id || 0,
      needs_review: transaction.needs_review || false,
    }));

  return filteredTransactions;
};
