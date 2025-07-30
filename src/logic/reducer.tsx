import unique from 'just-unique';
import { Action, ActionTypes } from './actions/action.types';
import {
  StepTypes,
  TransactionMatcherState,
  StandardisedTransaction,
  PocketSmithTransaction,
} from './types';
import { DateTime } from 'luxon';

const transactionMatcherReducer = (
  state: TransactionMatcherState,
  action: Action
): TransactionMatcherState => {
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
        totalTransactions: undefined,
      };
    case ActionTypes.CSV_PROCESSING_SUCCESS:
      const transactions = action.payload as StandardisedTransaction[];
      const totalTransactions = transactions.length;
      return {
        ...state,
        currentStep: StepTypes.CSV_PROCESSING_SUCCESS,
        transactions,
        csvFiles: unique(
          transactions.map(transaction => transaction.OriginalCSV || '')
        ),
        totalTransactionsPerCSV: transactions.reduce(
          (acc, transaction) => {
            const csv = transaction.OriginalCSV;
            if (csv) {
              if (!acc[csv]) {
                acc[csv] = 0;
              }
              acc[csv]++;
            }

            return acc;
          },
          {} as Record<string, number>
        ),
        totalTransactions,
        csvProcessingError: undefined,
      };
    case ActionTypes.CSV_PROCESSING_ERROR:
      return {
        ...state,
        currentStep: StepTypes.CSV_PROCESSING_ERROR,
        csvProcessingError: action.payload as string,
      };
    case ActionTypes.POCKETSMITH_FETCH_START:
      return {
        ...state,
        currentStep: StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS,
        pocketsmithFetchError: undefined,
        pocketsmithTransactions: undefined,
        pocketsmithFetchDateRange: action.payload as {
          startDate: string;
          endDate: string;
        },
      };
    case ActionTypes.POCKETSMITH_FETCH_SUCCESS:
      return {
        ...state,
        currentStep: StepTypes.POCKETSMITH_FETCH_SUCCESS,
        pocketsmithTransactions: action.payload as PocketSmithTransaction[],
        pocketsmithFetchError: undefined,
      };
    case ActionTypes.POCKETSMITH_FETCH_ERROR:
      return {
        ...state,
        currentStep: StepTypes.POCKETSMITH_FETCH_ERROR,
        pocketsmithFetchError: action.payload as string,
      };
    case ActionTypes.TRANSACTION_MATCHING_START:
      return {
        ...state,
        currentStep: StepTypes.MATCHING_TRANSACTIONS,
        transactionMatchingError: undefined,
        successfullyMatchedTransactions: undefined,
        unmatchedTransactions: undefined,
      };
    case ActionTypes.TRANSACTION_MATCHING_SUCCESS:
      const matchingPayload = action.payload as {
        successfullyMatchedTransactions: StandardisedTransaction[];
        unmatchedTransactions: StandardisedTransaction[];
      };
      return {
        ...state,
        currentStep: StepTypes.TRANSACTION_MATCHING_SUCCESS,
        successfullyMatchedTransactions:
          matchingPayload.successfullyMatchedTransactions,
        unmatchedTransactions: matchingPayload.unmatchedTransactions,
        transactionMatchingError: undefined,
      };
    case ActionTypes.TRANSACTION_MATCHING_ERROR:
      return {
        ...state,
        currentStep: StepTypes.TRANSACTION_MATCHING_ERROR,
        transactionMatchingError: action.payload as string,
      };
    case ActionTypes.INTERACTIVE_MATCHING_START:
      return {
        ...state,
        currentStep: StepTypes.INTERACTIVE_MATCHING,
        currentUnmatchedIndex: 0,
        waitingForUserInput: true,
        userFoundMatch: undefined,
        paypalTransactionNumber: undefined,
        payeeName: undefined,
      };
    case ActionTypes.SET_CURRENT_UNMATCHED_TRANSACTION:
      return {
        ...state,
        currentUnmatchedIndex: action.payload as number,
        waitingForUserInput: true,
        userFoundMatch: undefined,
        paypalTransactionNumber: undefined,
        payeeName: undefined,
      };
    case ActionTypes.USER_RESPONSE_FOUND_MATCH:
      return {
        ...state,
        userFoundMatch: true,
        waitingForUserInput: false,
      };
    case ActionTypes.USER_RESPONSE_NO_MATCH:
      return {
        ...state,
        userFoundMatch: false,
        waitingForUserInput: false,
      };
    case ActionTypes.SET_MANUAL_MATCH_DETAILS:
      const matchDetails = action.payload as {
        paypalTransactionNumber: string;
        payeeName: string;
      };
      return {
        ...state,
        paypalTransactionNumber: matchDetails.paypalTransactionNumber,
        payeeName: matchDetails.payeeName,
      };
    case ActionTypes.PROCESS_MANUAL_MATCH:
      const currentTransaction =
        state.unmatchedTransactions?.[state.currentUnmatchedIndex || 0];
      if (
        currentTransaction &&
        state.paypalTransactionNumber &&
        state.payeeName
      ) {
        const allMatchedTransactions = [
          ...(state.successfullyMatchedTransactions || []),
          ...(state.manuallyMatchedTransactions || []),
        ];

        const existingTransaction = allMatchedTransactions.find(
          t => t.paypalTransactionId === state.paypalTransactionNumber
        );

        if (existingTransaction) {
          return {
            ...state,
            paypalIdConflict: {
              paypalId: state.paypalTransactionNumber,
              existingTransaction,
              currentTransaction,
            },
            waitingForConflictResolution: true,
            waitingForUserInput: false,
          };
        }

        const processedTransaction = state.transactions?.find(
          t => t.paypalTransactionId === state.paypalTransactionNumber
        );

        const manualMatchTimestamp = DateTime.now().setZone('Europe/London').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);

        let updatedNote: string;
        if (processedTransaction) {
          updatedNote = processedTransaction.Note.replace(
            /^Automatched from Paypal/,
            `Manually matched from Paypal`
          ) + `\nManually matched on ${manualMatchTimestamp}`;
        } else {
          updatedNote = `${currentTransaction.Note}\nManually matched on ${manualMatchTimestamp}\nManual PayPal Transaction ID: ${state.paypalTransactionNumber}`;
        }

        const updatedTransaction: StandardisedTransaction = {
          ...currentTransaction,
          paypalTransactionId: state.paypalTransactionNumber,
          Payee: state.payeeName,
          Note: updatedNote,
          manuallyMatched: true,
        };

        const updatedManualMatches = [
          ...(state.manuallyMatchedTransactions || []),
          updatedTransaction,
        ];
        const updatedUnmatched =
          state.unmatchedTransactions?.filter(
            (_, index) => index !== state.currentUnmatchedIndex
          ) || [];

        return {
          ...state,
          manuallyMatchedTransactions: updatedManualMatches,
          unmatchedTransactions: updatedUnmatched,
          currentUnmatchedIndex: state.currentUnmatchedIndex,
          waitingForUserInput: updatedUnmatched.length > 0,
          userFoundMatch: undefined,
          paypalTransactionNumber: undefined,
          payeeName: undefined,
        };
      }
      return state;
    case ActionTypes.PAYPAL_ID_CONFLICT_DETECTED:
      const conflictPayload = action.payload as {
        paypalId: string;
        existingTransaction: StandardisedTransaction;
        currentTransaction: StandardisedTransaction;
      };
      return {
        ...state,
        paypalIdConflict: conflictPayload,
        waitingForConflictResolution: true,
        waitingForUserInput: false,
      };
    case ActionTypes.RESOLVE_PAYPAL_ID_CONFLICT:
      const resolutionPayload = action.payload as { keepExisting: boolean };
      if (state.paypalIdConflict) {
        const { existingTransaction, currentTransaction } = state.paypalIdConflict;

        if (resolutionPayload.keepExisting) {
          const updatedUnmatched = [
            ...(state.unmatchedTransactions || []),
            currentTransaction,
          ];
          return {
            ...state,
            unmatchedTransactions: updatedUnmatched,
            paypalIdConflict: undefined,
            waitingForConflictResolution: false,
            waitingForUserInput: true,
            userFoundMatch: undefined,
            paypalTransactionNumber: undefined,
            payeeName: undefined,
          };
        } else {
          const paypalTransactionNumber = state.paypalTransactionNumber;
          const payeeName = state.payeeName;

          if (!paypalTransactionNumber || !payeeName) {
            return state;
          }

          const allMatched = [
            ...(state.successfullyMatchedTransactions || []),
            ...(state.manuallyMatchedTransactions || []),
          ];

          const filteredMatched = allMatched.filter(
            t => t.paypalTransactionId !== state.paypalIdConflict?.paypalId
          );

          const processedTransaction = state.transactions?.find(
            t => t.paypalTransactionId === paypalTransactionNumber
          );

          const manualMatchTimestamp = DateTime.now().setZone('Europe/London').toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);

          let updatedNote: string;
          if (processedTransaction) {
            updatedNote = processedTransaction.Note.replace(
              /^Automatched from Paypal/,
              `Manually matched from Paypal`
            ) + `\nManually matched on ${manualMatchTimestamp}`;
          } else {
            updatedNote = `${currentTransaction.Note}\nManually matched on ${manualMatchTimestamp}\nManual PayPal Transaction ID: ${paypalTransactionNumber}`;
          }

          const updatedTransaction: StandardisedTransaction = {
            ...currentTransaction,
            paypalTransactionId: paypalTransactionNumber,
            Payee: payeeName,
            Note: updatedNote,
            manuallyMatched: true,
          };

          const updatedUnmatched = [
            ...(state.unmatchedTransactions?.filter(
              (_, index) => index !== state.currentUnmatchedIndex
            ) || []),
            existingTransaction,
          ];

          const autoMatched = filteredMatched.filter(t => !t.manuallyMatched);
          const manualMatched = [
            ...filteredMatched.filter(t => t.manuallyMatched),
            updatedTransaction,
          ];

          return {
            ...state,
            successfullyMatchedTransactions: autoMatched,
            manuallyMatchedTransactions: manualMatched,
            unmatchedTransactions: updatedUnmatched,
            paypalIdConflict: undefined,
            waitingForConflictResolution: false,
            waitingForUserInput: updatedUnmatched.length > 0,
            userFoundMatch: undefined,
            paypalTransactionNumber: undefined,
            payeeName: undefined,
          };
        }
      }
      return state;
    case ActionTypes.INTERACTIVE_MATCHING_COMPLETE:
      return {
        ...state,
        currentStep: StepTypes.INTERACTIVE_MATCHING_COMPLETE,
        waitingForUserInput: false,
        currentUnmatchedIndex: undefined,
        userFoundMatch: undefined,
        paypalTransactionNumber: undefined,
        payeeName: undefined,
        paypalIdConflict: undefined,
        waitingForConflictResolution: false,
      };
    case ActionTypes.CONFIRMING_MATCHED_TRANSACTIONS_START:
      return {
        ...state,
        currentStep: StepTypes.CONFIRMING_MATCHED_TRANSACTIONS,
        confirmedMatches: [],
        rejectedMatches: [],
        currentMatchIndex: undefined,
      };
    case ActionTypes.SET_CURRENT_MATCH_INDEX:
      return {
        ...state,
        currentMatchIndex: action.payload as number,
      };
    case ActionTypes.CONFIRM_MATCH:
      const confirmedTransaction = state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0];
      if (confirmedTransaction) {
        return {
          ...state,
          confirmedMatches: [...(state.confirmedMatches || []), confirmedTransaction],
        };
      }
      return state;
    case ActionTypes.REJECT_MATCH:
      const rejectedTransaction = state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0];
      if (rejectedTransaction) {
        return {
          ...state,
          rejectedMatches: [...(state.rejectedMatches || []), rejectedTransaction],
        };
      }
      return state;
    case ActionTypes.CONFIRMING_MATCHED_TRANSACTIONS_COMPLETE:
      const payload = action.payload as {
        totalPocketsmithTransactions: number;
        automaticallyMatched: number;
        manuallyMatched: number;
        skippedDuringConfirmation: number;
        remainingUnmatched: number;
        unmatchedTransactions: StandardisedTransaction[];
      };
      return {
        ...state,
        finalStats: {
          totalPocketsmithTransactions: payload.totalPocketsmithTransactions,
          automaticallyMatched: payload.automaticallyMatched,
          manuallyMatched: payload.manuallyMatched,
          skippedDuringConfirmation: payload.skippedDuringConfirmation,
          remainingUnmatched: payload.remainingUnmatched,
        },
        unmatchedTransactions: payload.unmatchedTransactions,
      };
    case ActionTypes.PROCESSING_COMPLETE:
      return {
        ...state,
        currentStep: StepTypes.PROCESSING_COMPLETE,
      };
    default:
      return state;
  }
};

export default transactionMatcherReducer;
