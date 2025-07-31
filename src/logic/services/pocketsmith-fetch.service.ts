import { createPocketSmithClient } from 'pocketsmith-ts';
import { env } from '@/env';
import { DateTime } from 'luxon';
import { PocketSmithTransaction, TransactionAccount, CSVType } from '../types';

export interface DateRange {
  startDate: DateTime;
  endDate: DateTime;
}

export interface FetchTransactionsParams {
  dateRange: DateRange;
  search?: string;
  uncategorised?: boolean;
  perPage?: number;
  transactionAccountId?: number;
  csvType?: CSVType;
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

export const fetchUserTransactionAccounts = async (): Promise<
  TransactionAccount[]
> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const user = await fetchCurrentUser();

  const { data: rawAccounts, error: accountsError } = await client.GET(
    '/users/{id}/accounts',
    {
      params: {
        path: { id: user.id },
      },
    }
  );

  if (accountsError) {
    throw new Error(
      `Failed to fetch transaction accounts: ${JSON.stringify(accountsError)}`
    );
  }

  if (!rawAccounts || rawAccounts.length === 0) {
    throw new Error('No transaction accounts found in PocketSmith');
  }

  return rawAccounts.map(account => ({
    id: account.id || 0,
    name: account.title || '',
    type: account.type || '',
    currency_code: account.currency_code || 'GBP',
  }));
};

export const fetchUserTransactions = async ({
  dateRange,
  search = 'Paypal',
  uncategorised = true,
  perPage = 1000,
  transactionAccountId,
  csvType = CSVType.PAYPAL,
}: FetchTransactionsParams): Promise<PocketSmithTransaction[]> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const user = await fetchCurrentUser();

  let searchTerm = search;
  if (csvType === CSVType.AMAZON && search === 'Paypal') {
    searchTerm = 'Amazon';
  }

  const queryParams: Record<string, string | number | boolean> = {
    start_date: dateRange.startDate.toFormat('yyyy-MM-dd'),
    end_date: dateRange.endDate.toFormat('yyyy-MM-dd'),
    uncategorised: uncategorised ? 1 : 0,
    search: searchTerm,
    per_page: perPage,
  };

  let pocketSmithEndpoint: string = '/users/{id}/transactions';
  let pocketSmithPath: Record<string, string | number> = { id: user.id };

  if (transactionAccountId) {
    queryParams.transaction_account_id = transactionAccountId;
    pocketSmithEndpoint = '/accounts/{id}/transactions';
    pocketSmithPath = { id: transactionAccountId };
  }

  const { data: rawTransactions, error: transactionsError } = await client.GET(
    pocketSmithEndpoint as any,
    {
      params: {
        path: pocketSmithPath,
        query: queryParams,
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
    .filter((transaction: PocketSmithTransaction) => {
      const matchesPayee =
        csvType === CSVType.PAYPAL
          ? transaction.payee?.toLowerCase().includes(searchTerm.toLowerCase())
          : true;

      const matchesAmazonPattern =
        csvType === CSVType.AMAZON &&
        transaction.payee &&
        (transaction.payee.toLowerCase().includes('amazon') ||
          transaction.payee.toLowerCase().includes('amz') ||
          transaction.payee.toLowerCase().includes('amzn'));

      const hasNoLabels =
        !transaction.labels || transaction.labels.length === 0;

      return (matchesPayee || matchesAmazonPattern) && hasNoLabels;
    })
    .map((transaction: PocketSmithTransaction) => ({
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

export const fetchAmazonTransactions = async ({
  dateRange,
  transactionAccountId,
  perPage = 1000,
}: {
  dateRange: DateRange;
  transactionAccountId: number;
  perPage?: number;
}): Promise<PocketSmithTransaction[]> => {
  return await fetchUserTransactions({
    dateRange,
    search: 'Amazon',
    uncategorised: true,
    perPage,
    transactionAccountId,
    csvType: CSVType.AMAZON,
  });
};

export const validateTransactionAccount = async (
  accountId: number
): Promise<boolean> => {
  try {
    const accounts = await fetchUserTransactionAccounts();
    return accounts.some(account => account.id === accountId);
  } catch (error) {
    console.error('Error validating transaction account:', error);
    return false;
  }
};
