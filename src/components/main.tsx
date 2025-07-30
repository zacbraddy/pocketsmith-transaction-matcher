import { Text, Box } from 'ink';
import useTransactionMatcher from '../logic';
import { StepTypes, TransactionMatcherState } from '@/logic/types';
import { useEffect, useState } from 'react';
import { env } from '../env';
import Spinner from 'ink-spinner';

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
      if (prevBuffer.length === 0 || prevBuffer[prevBuffer.length - 1] !== newMessage) {
        return [...prevBuffer, newMessage];
      }
      return prevBuffer;
    });
  }, [state.currentStep, state.csvProcessingError, state.csvFiles, state.totalTransactions]);

  return (
    <Box flexDirection="column">
      <Text color="green">📊 PocketSmith Transaction Matcher</Text>
      <Text color="grey">Environment: {env.nodeEnv} | API: {env.pocketsmithBaseUrl.replace('https://', '')} | Threshold: {env.matchingThreshold}</Text>

      <Box flexDirection="column" marginTop={1}>
        {messageBuffer.map((message, index) => {
          const isLatest = index === messageBuffer.length - 1;
          const isError = message.includes('❌');
          const isSuccess = message.includes('✅');

          let color = "blue";
          if (isError) color = "red";
          else if (isSuccess) color = "green";
          else if (!isLatest) color = "gray";

          return (
            <Box key={index} flexDirection="row">
              <Text color={color}>{message}</Text>
              {isLatest && state.currentStep === StepTypes.IS_PROCESSING_CSV && (
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
    </Box>
  );
};

export default Main;
