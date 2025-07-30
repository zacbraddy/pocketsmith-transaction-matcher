import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { DateTime } from 'luxon';
import flatten from 'just-flatten-it';
import { PayPalTransaction, StandardisedTransaction } from '../types';
import { getCurrencyRates } from './unirate.service';

export interface CSVProcessingOptions {
  inputFolder?: string;
  baseCurrency?: string;
  excludeDescriptions?: string[];
}

export const processCSVFiles = async (
  options: CSVProcessingOptions = {}
): Promise<StandardisedTransaction[]> => {
  const {
    inputFolder = path.join(process.cwd(), 'data', 'input'),
    baseCurrency = 'GBP',
    excludeDescriptions = [
      'Bank Deposit to PP Account',
      'General Currency Conversion',
    ],
  } = options;

  // Read all files from the input directory
  const files = fs.readdirSync(inputFolder);
  const csvFiles = files.filter(file =>
    file.toLowerCase().endsWith('.csv')
  );

  if (csvFiles.length === 0) {
    throw new Error('No CSV files found in the input directory');
  }

  // Parse all CSV files
  const allTransactions = flatten(
    csvFiles.map(filename => {
      const filePath = path.join(inputFolder, filename);
      const csvContent = fs.readFileSync(filePath, 'utf8');
      const parseResult = Papa.parse<PayPalTransaction>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim(),
      });

      if (parseResult.errors.length > 0) {
        throw new Error(
          `Errors parsing ${filename}: ${parseResult.errors.map(e => e.message).join(', ')}`
        );
      }

      return parseResult.data
        .filter(transaction =>
          !excludeDescriptions.includes(transaction.Description)
        )
        .map(transaction => ({ ...transaction, OriginalCSV: filename }));
    })
  );

  // Get currency rates
  const currencyRateCache = await getCurrencyRates(baseCurrency);
  const runDate = DateTime.now().setZone('Europe/London');

  // Convert to standardised transactions
  const standardisedTransactions = allTransactions.map(transaction => {
    const currency = transaction.Currency;
    const rate = currencyRateCache[currency];

    if (!rate) {
      throw new Error(`Rate not found for ${currency}`);
    }

    const transactionDateTime = DateTime.fromFormat(
      `${transaction.Date} ${transaction.Time}`,
      'dd/MM/yyyy HH:mm:ss',
      { zone: transaction['Time Zone'] }
    ).setZone('Europe/London');

    if (!transactionDateTime.isValid) {
      throw new Error(
        `Invalid date/time format in transaction ${transaction['Transaction ID']}: "${transaction.Date} ${transaction.Time}" (${transactionDateTime.invalidReason})`
      );
    }

    let originalDateString: string;
    try {
      const originalDateTime = DateTime.fromISO(`${transaction.Date} ${transaction.Time}`, {
        zone: transaction['Time Zone']
      }).setZone('Europe/London');

      originalDateString = originalDateTime.isValid
        ? originalDateTime.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        : `${transaction.Date} ${transaction.Time} (${transaction['Time Zone']})`;
    } catch {
      originalDateString = `${transaction.Date} ${transaction.Time} (${transaction['Time Zone']})`;
    }

    let note = `Automatched from Paypal on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)} from the file ${transaction.OriginalCSV}\nOriginal Paypal Transaction ID: ${transaction['Transaction ID']}\nOriginal Paypal Date: ${originalDateString}\nOriginal Paypal Amount: ${transaction.Gross} ${transaction.Currency}`;

    if (transaction.Currency !== baseCurrency) {
      note += `\nConverted from ${transaction.Currency} to ${baseCurrency} at ${rate} on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`;
    }

    return {
      Date: transactionDateTime,
      Payee: transaction.Name,
      Note: note,
      Amount: Number(transaction.Gross) / rate,
      Labels: ['Paypal Automated Conversion'],
      isForeignCurrency: transaction.Currency !== baseCurrency,
      OriginalCSV: transaction.OriginalCSV,
      paypalTransactionId: transaction['Transaction ID'],
    };
  });

  return standardisedTransactions;
};
