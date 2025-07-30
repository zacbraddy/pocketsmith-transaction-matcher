export enum StepTypes {
  INITIALISING = 'INITIALISING',
  PROCESSING_INPUTS = 'PROCESSING_INPUTS',
  IS_PROCESSING_CSV = 'IS_PROCESSING_CSV',
  CSV_PROCESSING_SUCCESS = 'CSV_PROCESSING_SUCCESS',
  CSV_PROCESSING_ERROR = 'CSV_PROCESSING_ERROR',
}

// PayPal CSV transaction structure
export interface PayPalTransaction {
  Date: string;
  Time: string;
  "Time Zone": string;
  Description: string;
  Currency: string;
  Gross: string;
  Fee: string;
  Net: string;
  Balance: string;
  "Transaction ID": string;
  "From Email Address": string;
  Name: string;
  "Bank Name": string;
  "Bank account": string;
  "Postage and Packaging Amount": string;
  VAT: string;
  "Invoice ID": string;
  "Reference Txn ID": string;
}

export interface StandardisedTransaction {
  Date: string;
  Note: string;
  Amount: number;
  Payee: string;
  Labels: string[];
  OriginalCSV?: string;
}

export interface TransactionMatcherState {
  currentStep?: StepTypes;
  transactions?: StandardisedTransaction[];
  csvFiles?: string[];
  csvProcessingError?: string;
  totalTransactions?: number;
  totalTransactionsPerCSV?: Record<string, number>;
}
