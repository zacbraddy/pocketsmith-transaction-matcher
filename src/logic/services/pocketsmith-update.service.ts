import { createPocketSmithClient } from 'pocketsmith-ts';
import { env } from '@/env';

export interface PocketSmithUpdateRequest {
  transactionId: number;
  payee: string;
  memo: string;
  labels?: string[];
}

export const updatePocketSmithTransaction = async ({
  transactionId,
  payee,
  memo,
  labels = [],
}: PocketSmithUpdateRequest): Promise<void> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const finalLabels = [...labels];
  if (!finalLabels.includes('automatched')) {
    finalLabels.push('automatched');
  }

  const { error } = await client.PUT('/transactions/{id}', {
    params: {
      path: { id: transactionId },
    },
    body: {
      payee,
      memo,
      labels: finalLabels.join(','),
    },
  });

  if (error) {
    throw new Error(
      `Failed to update PocketSmith transaction ${transactionId}: ${JSON.stringify(error)}`
    );
  }
};
