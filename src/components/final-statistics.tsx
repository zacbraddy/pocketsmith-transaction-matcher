import React, { useEffect, useMemo } from 'react';
import { Text, Box } from 'ink';
import {
  StandardisedTransaction,
  TransactionMatcherState,
  CSVType,
} from '../logic/types';

interface FinalStatisticsProps {
  state: TransactionMatcherState;
}

const FinalStatistics: React.FC<FinalStatisticsProps> = ({ state }) => {
  const stats = state.finalStats;
  const unmatchedTransactions = state.unmatchedTransactions;

  const transactionBreakdown = useMemo(() => {
    const allTransactions = [
      ...(state.confirmedMatches || []),
      ...(state.rejectedMatches || []),
      ...(unmatchedTransactions || []),
    ];

    const amazonTransactions = allTransactions.filter(
      t => t.csvType === CSVType.AMAZON
    );
    const paypalTransactions = allTransactions.filter(
      t => t.csvType === CSVType.PAYPAL
    );
    const confirmedAmazon = (state.confirmedMatches || []).filter(
      t => t.csvType === CSVType.AMAZON
    );
    const confirmedPayPal = (state.confirmedMatches || []).filter(
      t => t.csvType === CSVType.PAYPAL
    );

    return {
      amazonTransactions,
      paypalTransactions,
      confirmedAmazon,
      confirmedPayPal,
      totalAmazonValue: amazonTransactions.reduce(
        (sum, t) => sum + Math.abs(t.Amount),
        0
      ),
      totalPayPalValue: paypalTransactions.reduce(
        (sum, t) => sum + Math.abs(t.Amount),
        0
      ),
    };
  }, [state.confirmedMatches, state.rejectedMatches, unmatchedTransactions]);

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
          • Total PocketSmith transactions processed:{' '}
          {stats.totalPocketsmithTransactions}
        </Text>
        <Text color="green">
          • Automatically matched and updated: {stats.automaticallyMatched}
        </Text>
        <Text color="yellow">• Manually matched: {stats.manuallyMatched}</Text>
        <Text color="red">
          • Skipped during confirmation: {stats.skippedDuringConfirmation}
        </Text>
        <Text color="gray">
          • Remaining unmatched: {stats.remainingUnmatched}
        </Text>
      </Box>

      {(transactionBreakdown.amazonTransactions.length > 0 ||
        transactionBreakdown.paypalTransactions.length > 0) && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="cyan" bold>
            📈 Breakdown by Source:
          </Text>
          {transactionBreakdown.amazonTransactions.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              <Text color="orange" bold>
                📦 Amazon Orders:
              </Text>
              <Text color="white">
                • Total orders: {transactionBreakdown.amazonTransactions.length}
              </Text>
              <Text color="green">
                • Successfully updated:{' '}
                {transactionBreakdown.confirmedAmazon.length}
              </Text>
              <Text color="white">
                • Total value: £
                {transactionBreakdown.totalAmazonValue.toFixed(2)}
              </Text>
            </Box>
          )}
          {transactionBreakdown.paypalTransactions.length > 0 && (
            <Box flexDirection="column" marginLeft={2}>
              <Text color="blue" bold>
                📄 PayPal Transactions:
              </Text>
              <Text color="white">
                • Total transactions:{' '}
                {transactionBreakdown.paypalTransactions.length}
              </Text>
              <Text color="green">
                • Successfully updated:{' '}
                {transactionBreakdown.confirmedPayPal.length}
              </Text>
              <Text color="white">
                • Total value: £
                {transactionBreakdown.totalPayPalValue.toFixed(2)}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {unmatchedTransactions && unmatchedTransactions.length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="red" bold>
            ❌ Unmatched Transactions:
          </Text>
          {unmatchedTransactions.map(
            (transaction: StandardisedTransaction, index: number) => (
              <Box
                key={index}
                flexDirection="column"
                marginLeft={2}
                marginTop={1}
              >
                <Text color="white">
                  {index + 1}. £{transaction.Amount.toFixed(2)} -{' '}
                  {transaction.Date.toFormat('dd/MM/yyyy')} -{' '}
                  {transaction.Payee}{' '}
                  <Text
                    color={
                      transaction.csvType === CSVType.AMAZON ? 'orange' : 'blue'
                    }
                  >
                    (
                    {transaction.csvType === CSVType.AMAZON
                      ? '📦 Amazon'
                      : '📄 PayPal'}
                    )
                  </Text>
                </Text>
                <Text color="gray">Note: {transaction.Note}</Text>
                {transaction.csvType === CSVType.AMAZON &&
                  transaction.amazonOrderId && (
                    <Text color="gray">
                      Order ID: {transaction.amazonOrderId}
                    </Text>
                  )}
                {transaction.csvType === CSVType.PAYPAL &&
                  transaction.paypalTransactionId && (
                    <Text color="gray">
                      PayPal ID: {transaction.paypalTransactionId}
                    </Text>
                  )}
                {transaction.pocketsmithTransactionId && (
                  <Text color="gray">
                    PocketSmith ID: {transaction.pocketsmithTransactionId}
                  </Text>
                )}
                {transaction.skippedDuringMatching && (
                  <Text color="yellow">
                    ⚠️ Skipped during matching confirmation
                  </Text>
                )}
              </Box>
            )
          )}
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
