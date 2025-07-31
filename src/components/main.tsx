import { Text, Box } from 'ink';
import useTransactionMatcher from '../logic';
import { StepTypes, TransactionMatcherState } from '@/logic/types';
import { useEffect, useState } from 'react';
import { env } from '../env';
import Spinner from 'ink-spinner';
import { DateTime } from 'luxon';
import InteractiveMatching from './interactive-matching';
import MatchConfirmation from './match-confirmation';
import FinalStatistics from './final-statistics';
import AccountSelection from './account-selection';

const getDisplayMessage = (state: TransactionMatcherState) => {
  switch (state.currentStep) {
    case StepTypes.INITIALISING:
      return 'Initialising...';
    case StepTypes.PROCESSING_INPUTS:
      return 'Processing inputs...';
    case StepTypes.IS_PROCESSING_CSV:
      return '📄 Reading and parsing CSV files...';
    case StepTypes.CSV_PROCESSING_SUCCESS:
      return `✅ Successfully processed ${state.csvFiles?.length || 0} CSV file${(state.csvFiles?.length || 0) !== 1 ? 's' : ''} with ${state.totalTransactions || 0} total transactions`;
    case StepTypes.CSV_PROCESSING_ERROR:
      return `❌ Error processing CSV files: ${state.csvProcessingError}`;
    case StepTypes.WAITING_FOR_ACCOUNT_SELECTION:
      return `🏦 Please select a PocketSmith account to search for transactions`;
    case StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS:
      return `🔄 Fetching PocketSmith transactions from ${state.pocketsmithFetchDateRange?.startDate} to ${state.pocketsmithFetchDateRange?.endDate}...`;
    case StepTypes.POCKETSMITH_FETCH_SUCCESS:
      return `✅ Successfully fetched ${state.pocketsmithTransactions?.length || 0} PocketSmith transactions`;
    case StepTypes.POCKETSMITH_FETCH_ERROR:
      return `❌ Error fetching PocketSmith transactions: ${state.pocketsmithFetchError}`;
    case StepTypes.MATCHING_TRANSACTIONS:
      return '🔗 Matching transactions...';
    case StepTypes.TRANSACTION_MATCHING_SUCCESS:
      return `✅ Auto-matched ${state.successfullyMatchedTransactions?.length || 0} transactions, ${state.unmatchedTransactions?.length || 0} need manual review`;
    case StepTypes.TRANSACTION_MATCHING_ERROR:
      return `❌ Error matching transactions: ${state.transactionMatchingError}`;
    case StepTypes.CONFIRMING_MATCHED_TRANSACTIONS:
      return `🔍 Confirming matches - ${(state.currentMatchIndex || 0) + 1}/${state.successfullyMatchedTransactions?.length || 0} transactions`;
    case StepTypes.INTERACTIVE_MATCHING:
      return `🔍 Interactive matching in progress - ${(state.currentUnmatchedIndex || 0) + 1}/${state.unmatchedTransactions?.length || 0} transactions`;
    case StepTypes.INTERACTIVE_MATCHING_COMPLETE:
      return `✅ Interactive matching complete! All transactions processed`;
    case StepTypes.PROCESSING_COMPLETE:
      return `🎉 All processing complete!`;
    default:
      return 'PocketSmith Transaction Matcher is starting up...';
  }
};

const Main = () => {
  const { state, dispatch } = useTransactionMatcher();
  const [messageBuffer, setMessageBuffer] = useState<string[]>([]);

  useEffect(() => {
    const newMessage = getDisplayMessage(state);
    setMessageBuffer(prevBuffer => {
      if (
        prevBuffer.length === 0 ||
        prevBuffer[prevBuffer.length - 1] !== newMessage
      ) {
        return [...prevBuffer, newMessage];
      }
      return prevBuffer;
    });
  }, [state]);

  return (
    <Box flexDirection="column">
      <Text color="green">📊 PocketSmith Transaction Matcher</Text>
      <Text color="grey">
        Environment: {env.nodeEnv} | API:{' '}
        {env.pocketsmithBaseUrl.replace('https://', '')} | Days Tolerance:{' '}
        {env.daysTolerance}
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {messageBuffer.map((message, index) => {
          const isLatest = index === messageBuffer.length - 1;
          const isError = message.includes('❌');
          const isSuccess = message.includes('✅');

          let color = 'blue';
          if (isError) color = 'red';
          else if (isSuccess) color = 'green';
          else if (!isLatest) color = 'gray';

          return (
            <Box key={index} flexDirection="row">
              <Text color={color}>{message}</Text>
              {isLatest &&
                (state.currentStep === StepTypes.IS_PROCESSING_CSV ||
                  state.currentStep ===
                    StepTypes.FETCHING_POCKETSMITH_TRANSACTIONS ||
                  state.currentStep === StepTypes.MATCHING_TRANSACTIONS) && (
                  <Box marginLeft={1}>
                    <Spinner type="fistBump" />
                  </Box>
                )}
            </Box>
          );
        })}
      </Box>

      {state.csvFiles && state.csvFiles.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan">📋 CSV Files Processed:</Text>
          {state.csvFiles.map((csv, index) => (
            <Text key={index} color="white">
              • {csv}: {state.totalTransactionsPerCSV?.[csv] || 0} transactions
            </Text>
          ))}
        </Box>
      )}

      {state.pocketsmithTransactions &&
        state.pocketsmithTransactions.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">💳 PocketSmith Transactions Fetched:</Text>
            <Text color="white">
              • {state.pocketsmithTransactions.length} transactions from{' '}
              {DateTime.fromISO(
                state.pocketsmithFetchDateRange?.startDate || ''
              ).toFormat('dd/MM/yyyy')}{' '}
              to{' '}
              {DateTime.fromISO(
                state.pocketsmithFetchDateRange?.endDate || ''
              ).toFormat('dd/MM/yyyy')}
            </Text>
          </Box>
        )}

      {state.successfullyMatchedTransactions &&
        state.successfullyMatchedTransactions.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">
              🤖 Auto-Matched Transactions:{' '}
              {state.successfullyMatchedTransactions.length} total
            </Text>
          </Box>
        )}

      {state.manuallyMatchedTransactions &&
        state.manuallyMatchedTransactions.length > 0 && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="green">
              🤝 Manually Matched Transactions:{' '}
              {state.manuallyMatchedTransactions.length} total
            </Text>
          </Box>
        )}

      {state.unmatchedTransactions &&
        state.unmatchedTransactions.length > 0 &&
        state.currentStep !== StepTypes.INTERACTIVE_MATCHING && (
          <Box flexDirection="column" marginTop={1}>
            <Text color="yellow">⚠️ Unmatched PocketSmith Transactions:</Text>
            {state.unmatchedTransactions.map((transaction, index) => (
              <Text key={index} color="white">
                • £{transaction.Amount.toFixed(2)} - {transaction.Payee} -{' '}
                {transaction.Date.toFormat('dd/MM/yyyy')} (PS:{' '}
                {transaction.pocketsmithTransactionId})
              </Text>
            ))}
          </Box>
        )}

      {state.currentStep === StepTypes.WAITING_FOR_ACCOUNT_SELECTION && (
        <AccountSelection state={state} dispatch={dispatch} />
      )}

      {state.currentStep === StepTypes.CONFIRMING_MATCHED_TRANSACTIONS && (
        <MatchConfirmation state={state} dispatch={dispatch} />
      )}

      {state.currentStep === StepTypes.INTERACTIVE_MATCHING && (
        <InteractiveMatching state={state} dispatch={dispatch} />
      )}

      {state.currentStep === StepTypes.PROCESSING_COMPLETE && (
        <FinalStatistics state={state} />
      )}
    </Box>
  );
};

export default Main;
