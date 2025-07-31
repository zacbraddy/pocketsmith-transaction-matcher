import { createPocketSmithClient } from 'pocketsmith-ts';
import { env } from '@/env';
import { CSVType } from '../types';

export interface PocketSmithUpdateRequest {
  transactionId: number;
  payee?: string;
  memo: string;
  labels?: string[];
  csvType?: CSVType;
  amazonItems?: string;
  amazonOrderUrl?: string;
}

export interface BatchUpdateRequest {
  updates: PocketSmithUpdateRequest[];
  onProgress?: (completed: number, total: number) => void;
}

const formatAmazonTransactionNote = (
  amazonItems: string,
  amazonOrderUrl: string
): string => {
  const items = amazonItems.split(';').filter(item => item.trim() !== '');

  const itemList = items
    .map(item => {
      const trimmedItem = item.trim();
      return `• ${trimmedItem}`;
    })
    .join('\n');

  const note = `Items Purchased:
${itemList}

View Order Details: ${amazonOrderUrl}`;

  return note;
};

const formatAmazonTransactionMemo = (originalMemo: string): string => {
  return originalMemo;
};

const formatPayPalTransactionNote = (originalNote: string): string => {
  return originalNote;
};

const validateUpdateRequest = (request: PocketSmithUpdateRequest): string[] => {
  const errors: string[] = [];

  if (!request.transactionId || request.transactionId <= 0) {
    errors.push('Invalid transaction ID');
  }

  if (
    request.csvType === CSVType.PAYPAL &&
    (!request.payee || request.payee.trim() === '')
  ) {
    errors.push('Payee is required for PayPal transactions');
  }

  if (!request.memo || request.memo.trim() === '') {
    errors.push('Memo is required');
  }

  if (request.csvType === CSVType.AMAZON) {
    if (!request.amazonItems) {
      errors.push('Amazon items are required for Amazon transactions');
    }
    if (!request.amazonOrderUrl) {
      errors.push('Amazon order URL is required for Amazon transactions');
    }
  }

  return errors;
};

export const updatePocketSmithTransaction = async ({
  transactionId,
  payee,
  memo,
  labels = [],
  csvType = CSVType.PAYPAL,
  amazonItems,
  amazonOrderUrl,
}: PocketSmithUpdateRequest): Promise<void> => {
  const validationErrors = validateUpdateRequest({
    transactionId,
    payee,
    memo,
    labels,
    csvType,
    amazonItems,
    amazonOrderUrl,
  });
  if (validationErrors.length > 0) {
    throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
  }

  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  let formattedNote = '';
  let formattedMemo = '';

  if (csvType === CSVType.AMAZON && amazonItems && amazonOrderUrl) {
    formattedNote = formatAmazonTransactionNote(amazonItems, amazonOrderUrl);
    formattedMemo = formatAmazonTransactionMemo(memo);
  } else if (csvType === CSVType.PAYPAL) {
    formattedMemo = formatPayPalTransactionNote(memo);
  } else {
    formattedMemo = memo;
  }

  const finalLabels = [...labels];

  if (!finalLabels.includes('automatched')) {
    finalLabels.push('automatched');
  }

  if (csvType === CSVType.AMAZON && !finalLabels.includes('amazon')) {
    finalLabels.push('amazon');
  } else if (csvType === CSVType.PAYPAL && !finalLabels.includes('paypal')) {
    finalLabels.push('paypal');
  }

  const body: any = {
    labels: finalLabels.join(','),
  };

  if (csvType === CSVType.PAYPAL) {
    body.payee = payee;
  }

  if (csvType === CSVType.AMAZON) {
    body.note = formattedNote;
    body.memo = formattedMemo;
  } else {
    body.memo = formattedMemo;
  }

  const { error } = await client.PUT('/transactions/{id}', {
    params: {
      path: { id: transactionId },
    },
    body,
  });

  if (error) {
    throw new Error(
      `Failed to update PocketSmith transaction ${transactionId}: ${JSON.stringify(error)}`
    );
  }
};

export const batchUpdatePocketSmithTransactions = async ({
  updates,
  onProgress,
}: BatchUpdateRequest): Promise<void> => {
  const total = updates.length;
  let completed = 0;

  for (const updateRequest of updates) {
    try {
      await updatePocketSmithTransaction(updateRequest);
      completed++;

      if (onProgress) {
        onProgress(completed, total);
      }
    } catch (error) {
      console.error(
        `Failed to update transaction ${updateRequest.transactionId}:`,
        error
      );

      if (error instanceof Error && error.message.includes('authentication')) {
        throw error;
      }
    }
  }
};
