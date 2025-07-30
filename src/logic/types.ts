import { DateTime } from 'luxon';

export enum StepTypes {
  INITIALISING = 'INITIALISING',
  PROCESSING_INPUTS = 'PROCESSING_INPUTS',
  IS_PROCESSING_CSV = 'IS_PROCESSING_CSV',
  CSV_PROCESSING_SUCCESS = 'CSV_PROCESSING_SUCCESS',
  CSV_PROCESSING_ERROR = 'CSV_PROCESSING_ERROR',
  FETCHING_POCKETSMITH_TRANSACTIONS = 'FETCHING_POCKETSMITH_TRANSACTIONS',
  POCKETSMITH_FETCH_SUCCESS = 'POCKETSMITH_FETCH_SUCCESS',
  POCKETSMITH_FETCH_ERROR = 'POCKETSMITH_FETCH_ERROR',
  MATCHING_TRANSACTIONS = 'MATCHING_TRANSACTIONS',
  TRANSACTION_MATCHING_SUCCESS = 'TRANSACTION_MATCHING_SUCCESS',
  TRANSACTION_MATCHING_ERROR = 'TRANSACTION_MATCHING_ERROR',
  CONFIRMING_MATCHED_TRANSACTIONS = 'CONFIRMING_MATCHED_TRANSACTIONS',
  INTERACTIVE_MATCHING = 'INTERACTIVE_MATCHING',
  INTERACTIVE_MATCHING_COMPLETE = 'INTERACTIVE_MATCHING_COMPLETE',
  PROCESSING_COMPLETE = 'PROCESSING_COMPLETE',
}

// PayPal CSV transaction structure
export interface PayPalTransaction {
  Date: string;
  Time: string;
  'Time Zone': string;
  Description: string;
  Currency: string;
  Gross: string;
  Fee: string;
  Net: string;
  Balance: string;
  'Transaction ID': string;
  'From Email Address': string;
  Name: string;
  'Bank Name': string;
  'Bank account': string;
  'Postage and Packaging Amount': string;
  VAT: string;
  'Invoice ID': string;
  'Reference Txn ID': string;
}

export interface StandardisedTransaction {
  Date: DateTime;
  Note: string;
  Amount: number;
  Payee: string;
  Labels: string[];
  OriginalCSV?: string;
  isForeignCurrency?: boolean;
  pocketsmithTransactionId?: number;
  paypalTransactionId?: string;
  manuallyMatched?: boolean;
}

export interface PocketSmithTransaction {
  id: number;
  payee: string;
  amount: number;
  date: string;
  memo: string;
  labels?: string[];
  account_id: number;
  category_id?: number;
  needs_review: boolean;
}

export interface TransactionMatcherState {
  currentStep?: StepTypes;
  transactions?: StandardisedTransaction[];
  csvFiles?: string[];
  csvProcessingError?: string;
  totalTransactions?: number;
  totalTransactionsPerCSV?: Record<string, number>;
  pocketsmithTransactions?: PocketSmithTransaction[];
  pocketsmithFetchError?: string;
  pocketsmithFetchDateRange?: {
    startDate: string;
    endDate: string;
  };
  successfullyMatchedTransactions?: StandardisedTransaction[];
  unmatchedTransactions?: StandardisedTransaction[];
  transactionMatchingError?: string;
  currentUnmatchedIndex?: number;
  waitingForUserInput?: boolean;
  userFoundMatch?: boolean;
  paypalTransactionNumber?: string;
  payeeName?: string;
  currentMatchIndex?: number;
  confirmedMatches?: StandardisedTransaction[];
  rejectedMatches?: StandardisedTransaction[];
  manuallyMatchedTransactions?: StandardisedTransaction[];
  paypalIdConflict?: {
    paypalId: string;
    existingTransaction: StandardisedTransaction;
    currentTransaction: StandardisedTransaction;
  };
  waitingForConflictResolution?: boolean;
  finalStats?: {
    totalPocketsmithTransactions: number;
    automaticallyMatched: number;
    manuallyMatched: number;
    skippedDuringConfirmation: number;
    remainingUnmatched: number;
  };
}
