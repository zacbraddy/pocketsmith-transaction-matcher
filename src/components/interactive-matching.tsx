import React, { useState, useEffect, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import { DateTime } from 'luxon';
import { TransactionMatcherState, CSVType } from '../logic/types';
import { Action } from '../logic/actions/action.types';
import {
  userResponseFoundMatch,
  userResponseNoMatch,
  setManualMatchDetails,
  setManualMultiMatchDetails,
  resolvePaypalIdConflict,
} from '../logic/actions/transaction-matching.actions';
import { Dispatch } from 'react';
import TextInput from 'ink-text-input';

interface InteractiveMatchingProps {
  state: TransactionMatcherState;
  dispatch: Dispatch<Action>;
}

const generatePayPalSearchUrl = (transactionDate: DateTime): string => {
  const startDate = transactionDate.minus({ weeks: 2 }).toFormat('yyyy-MM-dd');
  const endDate = transactionDate.plus({ weeks: 2 }).toFormat('yyyy-MM-dd');
  return `https://www.paypal.com/myaccount/activities/?start_date=${startDate}&end_date=${endDate}`;
};

const generateAmazonSearchUrl = (transactionDate: DateTime): string => {
  const startDate = transactionDate.minus({ weeks: 2 }).toFormat('yyyy-MM-dd');
  const endDate = transactionDate.plus({ weeks: 2 }).toFormat('yyyy-MM-dd');
  return `https://www.amazon.co.uk/gp/css/order-history?startDate=${startDate}&endDate=${endDate}`;
};

const InteractiveMatching: React.FC<InteractiveMatchingProps> = ({
  state,
  dispatch,
}) => {
  const [currentInput, setCurrentInput] = useState<
    'waiting' | 'transaction-id' | 'payee-name' | 'conflict-resolution'
  >('waiting');
  const [transactionId, setTransactionId] = useState('');
  const [payeeName, setPayeeName] = useState('');

  const currentTransaction =
    state.unmatchedTransactions?.[state.currentUnmatchedIndex || 0];

  const isConflictMode =
    state.waitingForConflictResolution && state.paypalIdConflict;

  const searchUrl = useMemo(() => {
    if (!currentTransaction) return '';
    return currentTransaction.csvType === CSVType.AMAZON
      ? generateAmazonSearchUrl(currentTransaction.Date)
      : generatePayPalSearchUrl(currentTransaction.Date);
  }, [currentTransaction]);

  const isAmazonTransaction = currentTransaction?.csvType === CSVType.AMAZON;

  const isShowingPocketSmithTransaction =
    isAmazonTransaction &&
    currentTransaction?.pocketsmithTransactionId &&
    !currentTransaction?.amazonOrderId;

  const progress = useMemo(() => {
    if (isConflictMode) return 'Resolving conflict';
    return `${(state.currentUnmatchedIndex || 0) + 1}/${state.unmatchedTransactions?.length || 0}`;
  }, [
    state.currentUnmatchedIndex,
    state.unmatchedTransactions?.length,
    isConflictMode,
  ]);

  const formattedDate = useMemo(() => {
    if (!currentTransaction) return '';
    return currentTransaction.Date.toFormat('dd/MM/yyyy');
  }, [currentTransaction]);

  useInput(input => {
    if (isConflictMode && currentInput === 'conflict-resolution') {
      if (input === '1') {
        dispatch(resolvePaypalIdConflict({ keepExisting: true }));
        setCurrentInput('waiting');
      } else if (input === '2') {
        dispatch(resolvePaypalIdConflict({ keepExisting: false }));
        setCurrentInput('waiting');
      }
    } else if (currentInput === 'waiting' && !isConflictMode) {
      if (input.toLowerCase() === 'y' || input.toLowerCase() === 'yes') {
        setCurrentInput('transaction-id');
        dispatch(userResponseFoundMatch());
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
        dispatch(userResponseNoMatch());
      }
    }
  });

  useEffect(() => {
    if (isConflictMode) {
      setCurrentInput('conflict-resolution');
    }
  }, [isConflictMode]);

  if (!currentTransaction && !state.paypalIdConflict) {
    return null;
  }

  const handleTransactionIdSubmit = (value: string) => {
    setTransactionId(value);

    if (isAmazonTransaction) {
      const orderIds = value
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

      if (orderIds.length > 1) {
        dispatch(
          setManualMultiMatchDetails({
            transactionIds: orderIds,
            payeeName: '',
          })
        );
      } else {
        dispatch(
          setManualMatchDetails({
            transactionId: value,
            payeeName: '',
          })
        );
      }

      setCurrentInput('waiting');
      setTransactionId('');
    } else {
      setCurrentInput('payee-name');
    }
  };

  const handlePayeeNameSubmit = (value: string) => {
    setPayeeName(value);

    dispatch(
      setManualMatchDetails({
        transactionId: transactionId,
        payeeName: value,
      })
    );

    setCurrentInput('waiting');
    setTransactionId('');
    setPayeeName('');
  };

  if (isConflictMode && state.paypalIdConflict) {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Text color="red">⚠️ PayPal ID Conflict Detected ({progress})</Text>

        <Box
          flexDirection="column"
          marginTop={1}
          padding={1}
          borderStyle="round"
          borderColor="red"
        >
          <Text color="red">🚨 Conflict Details:</Text>
          <Text color="white">
            PayPal ID "{state.paypalIdConflict.paypalId}" is already matched to:
          </Text>
          <Text color="yellow">
            Existing: £
            {state.paypalIdConflict.existingTransaction.Amount.toFixed(2)} -{' '}
            {state.paypalIdConflict.existingTransaction.Payee} -{' '}
            {state.paypalIdConflict.existingTransaction.Date.toFormat(
              'dd/MM/yyyy'
            )}
            {state.paypalIdConflict.existingTransaction.manuallyMatched
              ? ' (Manually matched)'
              : ' (Auto matched)'}
          </Text>
          <Text color="cyan">
            Current: £
            {state.paypalIdConflict.currentTransaction.Amount.toFixed(2)} -{' '}
            {state.paypalIdConflict.currentTransaction.Payee} -{' '}
            {state.paypalIdConflict.currentTransaction.Date.toFormat(
              'dd/MM/yyyy'
            )}
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color="green">What would you like to do?</Text>
          <Text color="white">
            1. Keep the existing match (current transaction will remain
            unmatched)
          </Text>
          <Text color="white">
            2. Replace with new match (existing transaction will be unmatched)
          </Text>
          <Text color="gray">Press 1 or 2 to choose</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">🔍 Interactive Transaction Matching ({progress})</Text>

      {currentTransaction && (
        <Box
          flexDirection="column"
          marginTop={1}
          padding={1}
          borderStyle="round"
          borderColor="yellow"
        >
          <Text color="yellow">
            📄{' '}
            {isShowingPocketSmithTransaction
              ? 'Bank Transaction'
              : isAmazonTransaction
                ? 'Amazon Order'
                : 'PayPal Transaction'}{' '}
            Details:
          </Text>
          <Text color="white">
            • Amount: £{currentTransaction.Amount.toFixed(2)}
          </Text>
          <Text color="white">• Date: {formattedDate}</Text>
          <Text color="white">• Payee: {currentTransaction.Payee}</Text>
          <Text color="white">• Note: {currentTransaction.Note}</Text>
          {isAmazonTransaction && currentTransaction.amazonOrderId && (
            <Text color="white">
              • Order ID: {currentTransaction.amazonOrderId}
            </Text>
          )}
          {isAmazonTransaction && currentTransaction.amazonItems && (
            <Text color="white">
              • Items:{' '}
              {currentTransaction.amazonItems.split(';').slice(0, 2).join('; ')}
              {currentTransaction.amazonItems.split(';').length > 2
                ? '...'
                : ''}
            </Text>
          )}
          <Text color="white">
            • PocketSmith ID: {currentTransaction.pocketsmithTransactionId}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">
          🔗 {isAmazonTransaction ? 'Amazon Order History' : 'PayPal Search'}{' '}
          Link:
        </Text>
        <Text color="cyan">{searchUrl}</Text>
        <Text color="gray">
          (This link shows{' '}
          {isAmazonTransaction ? 'Amazon orders' : 'PayPal transactions'} 2
          weeks either side of the transaction date)
        </Text>
      </Box>

      {currentInput === 'waiting' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">
            Did you find a matching{' '}
            {isAmazonTransaction ? 'Amazon order' : 'PayPal transaction'}? (y/n)
          </Text>
        </Box>
      )}

      {currentInput === 'transaction-id' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">
            Enter the{' '}
            {isAmazonTransaction
              ? 'Amazon order ID(s)'
              : 'PayPal transaction ID'}
            :
          </Text>
          {isAmazonTransaction && (
            <Text color="gray">
              (For multiple orders, separate with commas: 123-456-789,
              987-654-321)
            </Text>
          )}
          <TextInput
            value={transactionId}
            onChange={setTransactionId}
            onSubmit={handleTransactionIdSubmit}
            focus={true}
          />
        </Box>
      )}

      {currentInput === 'payee-name' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">Enter the payee name for this transaction:</Text>
          <TextInput
            value={payeeName}
            onChange={setPayeeName}
            onSubmit={handlePayeeNameSubmit}
            focus={true}
          />
        </Box>
      )}
    </Box>
  );
};

export default InteractiveMatching;
