import React, { useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import { DateTime } from 'luxon';
import {
  StandardisedTransaction,
  TransactionMatcherState,
  PocketSmithTransaction,
} from '../logic/types';
import { Action } from '../logic/actions/action.types';
import {
  confirmMatch,
  rejectMatch,
} from '../logic/actions/match-confirmation.actions';
import { Dispatch } from 'react';

interface MatchConfirmationProps {
  state: TransactionMatcherState;
  dispatch: Dispatch<Action>;
}

const MatchConfirmation: React.FC<MatchConfirmationProps> = React.memo(({
  state,
  dispatch,
}) => {
  const currentMatchedTransaction = useMemo(
    () => state.successfullyMatchedTransactions?.[state.currentMatchIndex || 0],
    [state.successfullyMatchedTransactions, state.currentMatchIndex]
  );

  const currentPocketsmithTransaction = useMemo(
    () => currentMatchedTransaction
      ? state.pocketsmithTransactions?.find(
        ps => ps.id === currentMatchedTransaction.pocketsmithTransactionId
      )
      : undefined,
    [currentMatchedTransaction, state.pocketsmithTransactions]
  );

  const progress = useMemo(
    () => `${(state.currentMatchIndex || 0) + 1}/${state.successfullyMatchedTransactions?.length || 0}`,
    [state.currentMatchIndex, state.successfullyMatchedTransactions?.length]
  );

  const dateInfo = useMemo(() => {
    if (!currentMatchedTransaction || !currentPocketsmithTransaction) return null;

    return {
      paypalDate: currentMatchedTransaction.Date.toFormat('dd/MM/yyyy'),
      pocketsmithDate: DateTime.fromISO(currentPocketsmithTransaction.date).toFormat('dd/MM/yyyy'),
      daysDifference: Math.abs(
        currentMatchedTransaction.Date.diff(
          DateTime.fromISO(currentPocketsmithTransaction.date),
          'days'
        ).days
      ),
    };
  }, [currentMatchedTransaction, currentPocketsmithTransaction]);

  if (!currentMatchedTransaction || !currentPocketsmithTransaction) {
    return null;
  }

  useInput((input, key) => {
    if (input.toLowerCase() === 'y' || input === '' || key.return) {
      dispatch(confirmMatch());
    } else if (input.toLowerCase() === 'n') {
      dispatch(rejectMatch());
    }
  });

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color="cyan">🔍 Match Confirmation ({progress})</Text>

      <Box flexDirection="row" marginTop={1} gap={2}>
        <Box
          flexDirection="column"
          padding={1}
          borderStyle="round"
          borderColor="green"
          width="50%"
        >
          <Text color="green" bold>
            📄 PayPal Transaction (CSV) {currentMatchedTransaction.manuallyMatched ? '🤝 Manual Match' : '🤖 Auto Match'}
          </Text>
          <Text color="white">
            Amount: £{currentMatchedTransaction.Amount.toFixed(2)}
          </Text>
          <Text color="white">
            Date: {dateInfo?.paypalDate}
          </Text>
          <Text color="white">Payee: {currentMatchedTransaction.Payee}</Text>
          <Text color="white">Note: {currentMatchedTransaction.Note}</Text>
          {currentMatchedTransaction.paypalTransactionId && (
            <Text color="white">
              PayPal ID: {currentMatchedTransaction.paypalTransactionId}
            </Text>
          )}
          {currentMatchedTransaction.isForeignCurrency && (
            <Text color="yellow">⚠️ Foreign Currency</Text>
          )}
        </Box>

        <Box
          flexDirection="column"
          padding={1}
          borderStyle="round"
          borderColor="blue"
          width="50%"
        >
          <Text color="blue" bold>
            💳 PocketSmith Transaction
          </Text>
          <Text color="white">
            Amount: £{currentPocketsmithTransaction.amount.toFixed(2)}
          </Text>
          <Text color="white">
            Date: {dateInfo?.pocketsmithDate}
          </Text>
          {dateInfo && dateInfo.daysDifference > 7 && (
            <Text color="red" bold>
              ⚠️ Date difference: {Math.round(dateInfo.daysDifference)} days
            </Text>
          )}
          <Text color="white">
            Current Payee: {currentPocketsmithTransaction.payee}
          </Text>
          <Text color="white">
            Current Memo: {currentPocketsmithTransaction.memo}
          </Text>
          <Text color="white">ID: {currentPocketsmithTransaction.id}</Text>
          {currentPocketsmithTransaction.needs_review && (
            <Text color="yellow">⚠️ Needs Review</Text>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="yellow" bold>
          This will update the PocketSmith transaction to:
        </Text>
        <Text color="green">  Payee: {currentMatchedTransaction.Payee}</Text>
        <Text color="green">  Note: {currentMatchedTransaction.Note}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="magenta" bold>
          Would you like to make this match? (Y/n)
        </Text>
        <Text color="gray">
          Press Enter or Y to confirm, N to skip this transaction
        </Text>
      </Box>
    </Box>
  );
});

MatchConfirmation.displayName = 'MatchConfirmation';

export default MatchConfirmation;
