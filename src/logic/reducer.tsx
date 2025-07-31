import unique from 'just-unique';
import { Action, ActionTypes } from './actions/action.types';
import {
  StepTypes,
  TransactionMatcherState,
  StandardisedTransaction,
  PocketSmithTransaction,
  TransactionAccount,
  CSVType,
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
      const dateRange = action.payload as {
        startDate?: DateTime;
        endDate?: DateTime;
      };
      return {
        ...state,
        currentStep: StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS,
        pocketsmithFetchError: undefined,
        pocketsmithTransactions: undefined,
        pocketsmithFetchDateRange: {
          startDate: dateRange.startDate?.toISO() || '',
          endDate: dateRange.endDate?.toISO() || '',
        },
      };
    case ActionTypes.POCKETSMITH_FETCH_SUCCESS:
      const allTransactions = action.payload as PocketSmithTransaction[];
      const filteredTransactions = allTransactions.filter(transaction => {
        if (transaction.amount > 0) {
          return false;
        }
        return true;
      });

      return {
        ...state,
        currentStep: StepTypes.POCKETSMITH_FETCH_SUCCESS,
        pocketsmithTransactions: filteredTransactions,
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
        manualTransactionId: undefined,
        payeeName: undefined,
      };
    case ActionTypes.SET_CURRENT_UNMATCHED_TRANSACTION:
      return {
        ...state,
        currentUnmatchedIndex: action.payload as number,
        waitingForUserInput: true,
        userFoundMatch: undefined,
        manualTransactionId: undefined,
        payeeName: undefined,
      };
    case ActionTypes.USER_RESPONSE_FOUND_MATCH:
      return {
        ...state,
        userFoundMatch: true,
        waitingForUserInput: true,
      };
    case ActionTypes.USER_RESPONSE_NO_MATCH:
      return {
        ...state,
        userFoundMatch: false,
        waitingForUserInput: false,
      };
    case ActionTypes.SET_MANUAL_MATCH_DETAILS:
      const matchDetails = action.payload as {
        transactionId: string;
        payeeName: string;
      };
      return {
        ...state,
        manualTransactionId: matchDetails.transactionId,
        payeeName: matchDetails.payeeName,
        waitingForUserInput: false,
      };
    case ActionTypes.SET_MANUAL_MULTI_MATCH_DETAILS:
      const multiMatchDetails = action.payload as {
        transactionIds: string[];
        payeeName: string;
      };
      return {
        ...state,
        manualTransactionIds: multiMatchDetails.transactionIds,
        payeeName: multiMatchDetails.payeeName,
        waitingForUserInput: false,
      };
    case ActionTypes.PROCESS_MANUAL_MATCH:
      const currentTransaction =
        state.unmatchedTransactions?.[state.currentUnmatchedIndex || 0];
      const isAmazonTransaction =
        currentTransaction?.csvType === CSVType.AMAZON;
      const hasValidPayeeName = isAmazonTransaction || !!state.payeeName;

      if (
        currentTransaction &&
        (state.manualTransactionId || state.manualTransactionIds) &&
        hasValidPayeeName
      ) {
        if (isAmazonTransaction) {
          const orderIds = state.manualTransactionIds || [
            state.manualTransactionId!,
          ];
          const matchingAmazonOrders: StandardisedTransaction[] = [];

          for (const orderId of orderIds) {
            const order = state.transactions?.find(
              t => t.csvType === CSVType.AMAZON && t.amazonOrderId === orderId
            );

            if (!order) {
              return {
                ...state,
                errorMessage: `Could not find Amazon order with ID: ${orderId}`,
                waitingForUserInput: true,
                userFoundMatch: undefined,
                manualTransactionId: undefined,
                manualTransactionIds: undefined,
                payeeName: undefined,
              };
            }

            matchingAmazonOrders.push(order);
          }

          const allMatchedTransactions = [
            ...(state.successfullyMatchedTransactions || []),
            ...(state.manuallyMatchedTransactions || []),
          ];

          for (const order of matchingAmazonOrders) {
            const existingAmazonMatch = allMatchedTransactions.find(
              t => t.amazonOrderId === order.amazonOrderId
            );

            if (existingAmazonMatch) {
              return {
                ...state,
                errorMessage: `Amazon order ${order.amazonOrderId} is already matched to: £${existingAmazonMatch.Amount} on ${existingAmazonMatch.Date?.toFormat('dd/MM/yyyy')} - ${existingAmazonMatch.Payee} (ID: ${existingAmazonMatch.pocketsmithTransactionId})`,
                waitingForUserInput: true,
                userFoundMatch: undefined,
                manualTransactionId: undefined,
                manualTransactionIds: undefined,
                payeeName: undefined,
              };
            }
          }

          const manualMatchTimestamp = DateTime.now()
            .setZone('Europe/London')
            .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);

          const updatedTransactions: StandardisedTransaction[] =
            matchingAmazonOrders.map(order => ({
              ...order,
              pocketsmithTransactionId:
                currentTransaction.pocketsmithTransactionId,
              Note:
                order.Note +
                `\nManually matched on ${manualMatchTimestamp}` +
                (orderIds.length > 1
                  ? ` (Multi-order match: ${orderIds.join(', ')})`
                  : ''),
              Labels: [...(order.Labels || []), 'manual-match'],
              manuallyMatched: true,
            }));

          const updatedSuccessfulMatches = [
            ...(state.successfullyMatchedTransactions || []),
            ...updatedTransactions,
          ];
          const updatedUnmatched =
            state.unmatchedTransactions?.filter(
              (_, index) => index !== state.currentUnmatchedIndex
            ) || [];

          const nextIndex =
            (state.currentUnmatchedIndex || 0) >= updatedUnmatched.length
              ? Math.max(0, updatedUnmatched.length - 1)
              : state.currentUnmatchedIndex || 0;

          return {
            ...state,
            successfullyMatchedTransactions: updatedSuccessfulMatches,
            unmatchedTransactions: updatedUnmatched,
            currentUnmatchedIndex: nextIndex,
            waitingForUserInput: updatedUnmatched.length > 0,
            userFoundMatch: undefined,
            manualTransactionId: undefined,
            manualTransactionIds: undefined,
            payeeName: undefined,
            errorMessage: undefined,
          };
        } else {
          const allMatchedTransactions = [
            ...(state.successfullyMatchedTransactions || []),
            ...(state.manuallyMatchedTransactions || []),
          ];

          const existingTransaction = allMatchedTransactions.find(
            t => t.paypalTransactionId === state.manualTransactionId
          );

          if (existingTransaction) {
            return {
              ...state,
              paypalIdConflict: {
                paypalId: state.manualTransactionId || '',
                existingTransaction,
                currentTransaction,
              },
              waitingForConflictResolution: true,
              waitingForUserInput: false,
            };
          }

          const processedTransaction = state.transactions?.find(
            t => t.paypalTransactionId === state.manualTransactionId
          );

          const manualMatchTimestamp = DateTime.now()
            .setZone('Europe/London')
            .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);

          let updatedNote: string;
          let updatedLabels: string[];

          if (processedTransaction) {
            updatedNote =
              processedTransaction.Note.replace(
                /^Automatched from Paypal/,
                `Manually matched from Paypal`
              ) + `\nManually matched on ${manualMatchTimestamp}`;

            updatedLabels = [...(processedTransaction.Labels || [])];
            if (!updatedLabels.includes('manual-match')) {
              updatedLabels.push('manual-match');
            }
          } else {
            updatedNote = `${currentTransaction.Note}\nManually matched on ${manualMatchTimestamp}\nManual Transaction ID: ${state.manualTransactionId}`;

            updatedLabels = ['automatched', 'manual-match'];
          }

          const updatedTransaction: StandardisedTransaction = {
            ...currentTransaction,
            paypalTransactionId: state.manualTransactionId,
            Payee: state.payeeName,
            Note: updatedNote,
            Labels: updatedLabels,
            manuallyMatched: true,
          };

          const updatedSuccessfulMatches = [
            ...(state.successfullyMatchedTransactions || []),
            updatedTransaction,
          ];
          const updatedUnmatched =
            state.unmatchedTransactions?.filter(
              (_, index) => index !== state.currentUnmatchedIndex
            ) || [];

          const nextIndex =
            (state.currentUnmatchedIndex || 0) >= updatedUnmatched.length
              ? Math.max(0, updatedUnmatched.length - 1)
              : state.currentUnmatchedIndex || 0;

          return {
            ...state,
            successfullyMatchedTransactions: updatedSuccessfulMatches,
            unmatchedTransactions: updatedUnmatched,
            currentUnmatchedIndex: nextIndex,
            waitingForUserInput: updatedUnmatched.length > 0,
            userFoundMatch: undefined,
            manualTransactionId: undefined,
            payeeName: undefined,
          };
        }
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
        const { existingTransaction, currentTransaction } =
          state.paypalIdConflict;

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
            manualTransactionId: undefined,
            payeeName: undefined,
          };
        } else {
          const manualTransactionId = state.manualTransactionId;
          const payeeName = state.payeeName;

          if (!manualTransactionId || !payeeName) {
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
            t => t.paypalTransactionId === manualTransactionId
          );

          const manualMatchTimestamp = DateTime.now()
            .setZone('Europe/London')
            .toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS);

          let updatedNote: string;
          let updatedLabels: string[];

          if (processedTransaction) {
            updatedNote =
              processedTransaction.Note.replace(
                /^Automatched from Paypal/,
                `Manually matched from Paypal`
              ) + `\nManually matched on ${manualMatchTimestamp}`;

            updatedLabels = [...(processedTransaction.Labels || [])];
            if (!updatedLabels.includes('manual-match')) {
              updatedLabels.push('manual-match');
            }
          } else {
            updatedNote = `${currentTransaction.Note}\nManually matched on ${manualMatchTimestamp}\nManual Transaction ID: ${manualTransactionId}`;

            updatedLabels = ['automatched', 'manual-match'];
          }

          const updatedTransaction: StandardisedTransaction = {
            ...currentTransaction,
            paypalTransactionId: manualTransactionId,
            Payee: payeeName,
            Note: updatedNote,
            Labels: updatedLabels,
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

          const nextIndexAfterConflict =
            (state.currentUnmatchedIndex || 0) >= updatedUnmatched.length
              ? Math.max(0, updatedUnmatched.length - 1)
              : state.currentUnmatchedIndex || 0;

          return {
            ...state,
            successfullyMatchedTransactions: autoMatched,
            manuallyMatchedTransactions: manualMatched,
            unmatchedTransactions: updatedUnmatched,
            currentUnmatchedIndex: nextIndexAfterConflict,
            paypalIdConflict: undefined,
            waitingForConflictResolution: false,
            waitingForUserInput: updatedUnmatched.length > 0,
            userFoundMatch: undefined,
            manualTransactionId: undefined,
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
        manualTransactionId: undefined,
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
      const confirmedTransaction =
        state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0];
      if (confirmedTransaction) {
        return {
          ...state,
          confirmedMatches: [
            ...(state.confirmedMatches || []),
            confirmedTransaction,
          ],
        };
      }
      return state;
    case ActionTypes.REJECT_MATCH:
      const rejectedTransaction =
        state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0];
      if (rejectedTransaction) {
        return {
          ...state,
          rejectedMatches: [
            ...(state.rejectedMatches || []),
            rejectedTransaction,
          ],
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
    case ActionTypes.FETCH_TRANSACTION_ACCOUNTS:
      return {
        ...state,
        currentStep: StepTypes.WAITING_FOR_ACCOUNT_SELECTION,
        waitingForAccountSelection: true,
      };
    case ActionTypes.FETCH_TRANSACTION_ACCOUNTS_SUCCESS:
      const accounts = (action.payload as { accounts: TransactionAccount[] })
        .accounts;
      return {
        ...state,
        availableTransactionAccounts: accounts,
        waitingForAccountSelection: true,
      };
    case ActionTypes.FETCH_TRANSACTION_ACCOUNTS_ERROR:
      const error = (action.payload as { error: string }).error;
      return {
        ...state,
        pocketsmithFetchError: error,
        waitingForAccountSelection: false,
        currentStep: StepTypes.POCKETSMITH_FETCH_ERROR,
      };
    case ActionTypes.SELECT_TRANSACTION_ACCOUNT:
      const accountId = (action.payload as { accountId: number }).accountId;
      return {
        ...state,
        selectedTransactionAccountId: accountId,
        waitingForAccountSelection: false,
        currentStep: StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS,
      };
    case ActionTypes.SKIP_ACCOUNT_SELECTION:
      return {
        ...state,
        selectedTransactionAccountId: undefined,
        waitingForAccountSelection: false,
        currentStep: StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS,
      };
    default:
      return state;
  }
};

export default transactionMatcherReducer;
