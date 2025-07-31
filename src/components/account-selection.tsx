import React, { useMemo } from 'react';
import { Text, Box } from 'ink';
import SelectInput from 'ink-select-input';
import { TransactionMatcherState } from '@/logic/types';
import { Action } from '@/logic/actions/action.types';
import { Dispatch } from 'react';
import {
  selectTransactionAccountAction,
  skipAccountSelectionAction,
} from '../logic/actions/transaction-accounts.actions';

interface AccountSelectionProps {
  state: TransactionMatcherState;
  dispatch: Dispatch<Action>;
}

interface SelectItem {
  label: string;
  value: number | null;
}

const AccountSelection: React.FC<AccountSelectionProps> = React.memo(
  ({ state, dispatch }) => {
    const { availableTransactionAccounts, csvType } = state;

    const selectItems = useMemo((): SelectItem[] => {
      if (!availableTransactionAccounts) {
        return [];
      }

      const items: SelectItem[] = availableTransactionAccounts.map(account => ({
        label: `${account.name} (${account.type} • ${account.currency_code})`,
        value: account.id,
      }));

      // Add skip option for PayPal transactions
      if (csvType === 'PAYPAL') {
        items.push({
          label: 'Skip Account Selection (Search All Accounts)',
          value: null,
        });
      }

      return items;
    }, [availableTransactionAccounts, csvType]);

    const handleSelect = (item: SelectItem) => {
      if (item.value === null) {
        // Skip account selection
        dispatch(skipAccountSelectionAction());
      } else {
        // Select specific account
        dispatch(selectTransactionAccountAction(item.value));
      }
    };

    if (!availableTransactionAccounts) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold color="blue">
            Loading Transaction Accounts...
          </Text>
          <Text dimColor>
            Please wait while we fetch your PocketSmith transaction accounts.
          </Text>
        </Box>
      );
    }

    if (availableTransactionAccounts.length === 0) {
      return (
        <Box flexDirection="column" padding={1}>
          <Text bold color="red">
            No Transaction Accounts Found
          </Text>
          <Text dimColor>
            No transaction accounts were found in your PocketSmith account.
          </Text>
          <Text dimColor>
            Please ensure you have at least one transaction account set up in
            PocketSmith.
          </Text>
        </Box>
      );
    }

    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="blue">
          Select Transaction Account
        </Text>
        <Text dimColor>
          {csvType === 'AMAZON'
            ? 'Choose which account to search for Amazon transactions in:'
            : 'Choose which account to search for transactions in:'}
        </Text>
        <Box marginTop={1}>
          <SelectInput items={selectItems} onSelect={handleSelect} />
        </Box>
        {csvType === 'PAYPAL' && (
          <Box marginTop={1}>
            <Text dimColor>
              Note: PayPal transactions can be processed without account
              selection
            </Text>
          </Box>
        )}
      </Box>
    );
  }
);

AccountSelection.displayName = 'AccountSelection';

export default AccountSelection;
