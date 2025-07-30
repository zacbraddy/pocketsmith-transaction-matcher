import React, { useState, useEffect, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import { DateTime } from 'luxon';
import {
  StandardisedTransaction,
  TransactionMatcherState,
} from '../logic/types';
import { Action } from '../logic/actions/action.types';
import {
  userResponseFoundMatch,
  userResponseNoMatch,
  setManualMatchDetails,
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

const InteractiveMatching: React.FC<InteractiveMatchingProps> = ({
  state,
  dispatch,
}) => {
  const [currentInput, setCurrentInput] = useState<
    'waiting' | 'paypal-id' | 'payee-name' | 'conflict-resolution'
  >('waiting');
  const [paypalId, setPaypalId] = useState('');
  const [payeeName, setPayeeName] = useState('');

  const currentTransaction =
    state.unmatchedTransactions?.[state.currentUnmatchedIndex || 0];

  if (!currentTransaction && !state.paypalIdConflict) {
    return null;
  }

  const isConflictMode = state.waitingForConflictResolution && state.paypalIdConflict;

  const paypalUrl = useMemo(() => {
    if (!currentTransaction) return '';
    return generatePayPalSearchUrl(currentTransaction.Date);
  }, [currentTransaction?.Date]);

  const progress = useMemo(() => {
    if (isConflictMode) return 'Resolving conflict';
    return `${(state.currentUnmatchedIndex || 0) + 1}/${state.unmatchedTransactions?.length || 0}`;
  }, [state.currentUnmatchedIndex, state.unmatchedTransactions?.length, isConflictMode]);

  const formattedDate = useMemo(() => {
    if (!currentTransaction) return '';
    return currentTransaction.Date.toFormat('dd/MM/yyyy');
  }, [currentTransaction?.Date]);

  useInput((input, key) => {
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
        setCurrentInput('paypal-id');
        dispatch(userResponseFoundMatch());
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'no') {
        dispatch(userResponseNoMatch());
      }
    }
  });

  useEffect(() => {
    if (isConflictMode) {
      setCurrentInput('conflict-resolution');
    } else if (!state.waitingForUserInput) {
      setCurrentInput('waiting');
    }
  }, [isConflictMode, state.waitingForUserInput]);

  const handlePaypalIdSubmit = (value: string) => {
    setPaypalId(value);
    setCurrentInput('payee-name');
  };

  const handlePayeeNameSubmit = (value: string) => {
    setPayeeName(value);
    dispatch(
      setManualMatchDetails({
        paypalTransactionNumber: paypalId,
        payeeName: value,
      })
    );
    setCurrentInput('waiting');
    setPaypalId('');
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
            Existing: £{state.paypalIdConflict.existingTransaction.Amount.toFixed(2)} - {state.paypalIdConflict.existingTransaction.Payee} - {state.paypalIdConflict.existingTransaction.Date.toFormat('dd/MM/yyyy')}
            {state.paypalIdConflict.existingTransaction.manuallyMatched ? ' (Manually matched)' : ' (Auto matched)'}
          </Text>
          <Text color="cyan">
            Current: £{state.paypalIdConflict.currentTransaction.Amount.toFixed(2)} - {state.paypalIdConflict.currentTransaction.Payee} - {state.paypalIdConflict.currentTransaction.Date.toFormat('dd/MM/yyyy')}
          </Text>
        </Box>

        <Box flexDirection="column" marginTop={1}>
          <Text color="green">What would you like to do?</Text>
          <Text color="white">1. Keep the existing match (current transaction will remain unmatched)</Text>
          <Text color="white">2. Replace with new match (existing transaction will be unmatched)</Text>
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
          <Text color="yellow">📄 PocketSmith Transaction Details:</Text>
          <Text color="white">
            • Amount: £{currentTransaction.Amount.toFixed(2)}
          </Text>
          <Text color="white">
            • Date: {formattedDate}
          </Text>
          <Text color="white">• Payee: {currentTransaction.Payee}</Text>
          <Text color="white">• Note: {currentTransaction.Note}</Text>
          <Text color="white">
            • ID: {currentTransaction.pocketsmithTransactionId}
          </Text>
        </Box>
      )}

      <Box flexDirection="column" marginTop={1}>
        <Text color="blue">🔗 PayPal Search Link:</Text>
        <Text color="cyan">{paypalUrl}</Text>
        <Text color="gray">
          (This link shows PayPal transactions 2 weeks either side of the
          transaction date)
        </Text>
      </Box>

      {currentInput === 'waiting' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">
            Did you find a matching PayPal transaction? (y/n)
          </Text>
        </Box>
      )}

      {currentInput === 'paypal-id' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green">Enter the PayPal transaction ID:</Text>
          <TextInput
            value={paypalId}
            onChange={setPaypalId}
            onSubmit={handlePaypalIdSubmit}
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
          />
        </Box>
      )}
    </Box>
  );
};

export default InteractiveMatching;
