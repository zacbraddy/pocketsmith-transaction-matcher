import { UnirateClient } from 'unirate-api';
import { env } from '@/env';

export interface CurrencyRateResponse {
  [currency: string]: number;
}

export const getCurrencyRates = async (
  baseCurrency: string = 'GBP'
): Promise<CurrencyRateResponse> => {
  const client = new UnirateClient(env.unirateApiKey);

  try {
    const rates = (await client.getRate(baseCurrency)) as CurrencyRateResponse;

    if (!rates) {
      throw new Error(`Failed to fetch currency rates for ${baseCurrency}`);
    }

    return rates;
  } catch (error) {
    throw new Error(
      `Failed to fetch currency rates: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};
