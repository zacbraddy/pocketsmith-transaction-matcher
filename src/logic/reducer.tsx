import unique from "just-unique";
import { Action, ActionTypes } from "./actions/action.types";
import { StepTypes, TransactionMatcherState, StandardisedTransaction, PocketSmithTransaction } from "./types";

const transactionMatcherReducer = (state: TransactionMatcherState, action: Action): TransactionMatcherState => {
  switch (action.type) {
    case ActionTypes.INITIALISING:
      return { ...state, currentStep: StepTypes.INITIALISING };
    case ActionTypes.BEGIN_PROCESSING_INPUTS:
      return { ...state, currentStep: StepTypes.PROCESSING_INPUTS };
    case ActionTypes.CSV_PROCESSING_START:
      return {
        ...state,
        currentStep: StepTypes.IS_PROCESSING_CSV,
        csvProcessingError: undefined,
        csvFiles: undefined,
        transactions: undefined,
        totalTransactions: undefined
      };
    case ActionTypes.CSV_PROCESSING_SUCCESS:
      const transactions = action.payload as StandardisedTransaction[];
      const totalTransactions = transactions.length;
      return {
        ...state,
        currentStep: StepTypes.CSV_PROCESSING_SUCCESS,
        transactions,
        csvFiles: unique(transactions.map(transaction => transaction.OriginalCSV || '')),
        totalTransactionsPerCSV: transactions.reduce((acc, transaction) => {
          const csv = transaction.OriginalCSV;
          if (csv) {
            if (!acc[csv]) {
              acc[csv] = 0;
            }
            acc[csv]++;
          }

          return acc;
        }, {} as Record<string, number>),
        totalTransactions,
        csvProcessingError: undefined
      };
    case ActionTypes.CSV_PROCESSING_ERROR:
      return {
        ...state,
        currentStep: StepTypes.CSV_PROCESSING_ERROR,
        csvProcessingError: action.payload as string
      };
    case ActionTypes.POCKETSMITH_FETCH_START:
      return {
        ...state,
        currentStep: StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS,
        pocketsmithFetchError: undefined,
        pocketsmithTransactions: undefined,
        pocketsmithFetchDateRange: action.payload as { startDate: string; endDate: string }
      };
    case ActionTypes.POCKETSMITH_FETCH_SUCCESS:
      return {
        ...state,
        currentStep: StepTypes.POCKETSMITH_FETCH_SUCCESS,
        pocketsmithTransactions: action.payload as PocketSmithTransaction[],
        pocketsmithFetchError: undefined
      };
    case ActionTypes.POCKETSMITH_FETCH_ERROR:
      return {
        ...state,
        currentStep: StepTypes.POCKETSMITH_FETCH_ERROR,
        pocketsmithFetchError: action.payload as string
      };
    case ActionTypes.TRANSACTION_MATCHING_START:
      return {
        ...state,
        currentStep: StepTypes.MATCHING_TRANSACTIONS,
        transactionMatchingError: undefined,
        successfullyMatchedTransactions: undefined,
        unmatchedTransactions: undefined
      };
    case ActionTypes.TRANSACTION_MATCHING_SUCCESS:
      const matchingPayload = action.payload as {
        successfullyMatchedTransactions: StandardisedTransaction[];
        unmatchedTransactions: StandardisedTransaction[];
      };
      return {
        ...state,
        currentStep: StepTypes.TRANSACTION_MATCHING_SUCCESS,
        successfullyMatchedTransactions: matchingPayload.successfullyMatchedTransactions,
        unmatchedTransactions: matchingPayload.unmatchedTransactions,
        transactionMatchingError: undefined
      };
    case ActionTypes.TRANSACTION_MATCHING_ERROR:
      return {
        ...state,
        currentStep: StepTypes.TRANSACTION_MATCHING_ERROR,
        transactionMatchingError: action.payload as string
      };
    default:
      return state;
  }
};

export default transactionMatcherReducer;
