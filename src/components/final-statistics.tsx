import React, { useEffect } from 'react';
import { Text, Box } from 'ink';
import { DateTime } from 'luxon';
import {
  TransactionMatcherState,
} from '../logic/types';

interface FinalStatisticsProps {
  state: TransactionMatcherState;
}

const FinalStatistics: React.FC<FinalStatisticsProps> = ({ state }) => {
  const stats = state.finalStats;
  const unmatchedTransactions = state.unmatchedTransactions;

  useEffect(() => {
    const timer = setTimeout(() => {
      process.exit(0);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!stats) {
    return null;
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="green" bold>
        ✅ Processing Complete!
      </Text>

      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan" bold>
          📊 Final Statistics:
        </Text>
        <Text color="white">
          • Total PocketSmith transactions processed: {stats.totalPocketsmithTransactions}
        </Text>
        <Text color="green">
          • Automatically matched and updated: {stats.automaticallyMatched}
        </Text>
        <Text color="yellow">
          • Manually matched: {stats.manuallyMatched}
        </Text>
        <Text color="red">
          • Skipped during confirmation: {stats.skippedDuringConfirmation}
        </Text>
        <Text color="gray">
          • Remaining unmatched: {stats.remainingUnmatched}
        </Text>
      </Box>

      {unmatchedTransactions && unmatchedTransactions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red" bold>
            ❌ Unmatched Transactions:
          </Text>
          {unmatchedTransactions.map((transaction, index) => (
            <Box key={index} flexDirection="column" marginLeft={2} marginTop={1}>
              <Text color="white">
                {index + 1}. £{transaction.Amount.toFixed(2)} - {transaction.Date.toFormat('dd/MM/yyyy')} - {transaction.Payee}
              </Text>
              <Text color="gray">
                Note: {transaction.Note}
              </Text>
              {transaction.pocketsmithTransactionId && (
                <Text color="gray">
                  PocketSmith ID: {transaction.pocketsmithTransactionId}
                </Text>
              )}
              {(transaction as any).skippedDuringMatching && (
                <Text color="yellow">
                  ⚠️ Skipped during matching confirmation
                </Text>
              )}
            </Box>
          ))}
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">
          🎉 Thank you for using PocketSmith Transaction Matcher!
        </Text>
        <Text color="gray">
          Application will exit automatically in 5 seconds...
        </Text>
      </Box>
    </Box>
  );
};

export default FinalStatistics;
