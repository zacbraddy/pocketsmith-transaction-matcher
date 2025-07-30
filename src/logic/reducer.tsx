import unique from "just-unique";
import { Action, ActionTypes } from "./actions/action.types";
import { StepTypes, TransactionMatcherState, StandardisedTransaction } from "./types";

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
    default:
      return state;
  }
};

export default transactionMatcherReducer;
