import { createPocketSmithClient } from 'pocketsmith-ts';
import { env } from '@/env';

export interface PocketSmithUpdateRequest {
  transactionId: number;
  payee: string;
  memo: string;
}

export const updatePocketSmithTransaction = async ({
  transactionId,
  payee,
  memo,
}: PocketSmithUpdateRequest): Promise<void> => {
  const client = createPocketSmithClient({
    apiKey: env.pocketsmithApiKey,
    baseUrl: env.pocketsmithBaseUrl,
  });

  const { error } = await client.PUT('/transactions/{id}', {
    params: {
      path: { id: transactionId },
    },
    body: {
      payee,
      memo,
    },
  });

  if (error) {
    throw new Error(
      `Failed to update PocketSmith transaction ${transactionId}: ${JSON.stringify(error)}`
    );
  }
};
