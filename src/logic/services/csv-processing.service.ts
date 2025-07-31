import * as fs from 'fs';
import * as path from 'path';
import Papa from 'papaparse';
import { DateTime } from 'luxon';
import {
  PayPalTransaction,
  StandardisedTransaction,
  CSVType,
  AmazonTransaction,
} from '../types';
import { getCurrencyRates } from './unirate.service';

const detectCSVType = (headers: string[]): CSVType => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

  const amazonHeaders = [
    'order id',
    'order url',
    'items',
    'to',
    'date',
    'total',
  ];
  const hasAmazonHeaders = amazonHeaders.every(header =>
    normalizedHeaders.includes(header)
  );

  if (hasAmazonHeaders) {
    return CSVType.AMAZON;
  }

  const paypalHeaders = ['transaction id', 'description', 'gross', 'currency'];
  const hasPaypalHeaders = paypalHeaders.every(header =>
    normalizedHeaders.includes(header)
  );

  if (hasPaypalHeaders) {
    return CSVType.PAYPAL;
  }

  return CSVType.UNKNOWN;
};

const processAmazonTransactions = (
  transactions: AmazonTransaction[],
  filename: string
): StandardisedTransaction[] => {
  const runDate = DateTime.now().setZone('Europe/London');

  return transactions.map(transaction => {
    let transactionDate = DateTime.fromISO(transaction.date, {
      zone: 'Europe/London',
    });

    if (!transactionDate.isValid) {
      transactionDate = DateTime.fromFormat(transaction.date, 'yyyy-MM-dd', {
        zone: 'Europe/London',
      });
    }

    if (!transactionDate.isValid) {
      transactionDate = DateTime.fromFormat(transaction.date, 'dd/MM/yyyy', {
        zone: 'Europe/London',
      });
    }

    if (!transactionDate.isValid) {
      throw new Error(
        `Invalid date format in Amazon order ${transaction['order id']}: "${transaction.date}"`
      );
    }

    const totalAmount = parseFloat(transaction.total.replace(/[£,]/g, ''));

    if (isNaN(totalAmount)) {
      throw new Error(
        `Invalid amount format in Amazon order ${transaction['order id']}: "${transaction.total}"`
      );
    }

    let splitPayments: number[] = [];
    if (transaction.payments && transaction.payments.trim()) {
      const amountMatches = transaction.payments.match(/£([\d,]+\.?\d*)/g);
      if (amountMatches) {
        splitPayments = amountMatches
          .map(match => parseFloat(match.replace(/[£,]/g, '')))
          .filter(amount => !isNaN(amount) && amount > 0);
      }
    }

    if (splitPayments.length === 0) {
      splitPayments = [totalAmount];
    }

    const items = transaction.items
      .split(';')
      .filter(item => item.trim() !== '');
    const itemList = items.map(item => `• ${item.trim()}`).join('\n');

    let note = `Automatched from Amazon on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)} from the file ${filename}
Original Amazon Order ID: ${transaction['order id']}
Order Date: ${transaction.date}
Items Purchased:
${itemList}`;

    if (splitPayments.length > 1) {
      note += `\nSplit Payments: ${splitPayments.map(p => `£${p.toFixed(2)}`).join(', ')}`;
    }

    note += `\n\nView full order details: ${transaction['order url']}`;

    const payee = transaction.to || 'Amazon';

    return {
      Date: transactionDate,
      Payee: payee,
      Note: note,
      Amount: totalAmount,
      Labels: ['automatched', 'amazon'],
      csvType: CSVType.AMAZON,
      OriginalCSV: filename,
      amazonOrderId: transaction['order id'],
      amazonItems: transaction.items,
      amazonOrderUrl: transaction['order url'],
      amazonSplitPayments: splitPayments,
      isForeignCurrency: false,
    };
  });
};

const processPaypalTransactions = async (
  transactions: (PayPalTransaction & { OriginalCSV: string })[],
  currencyRateCache: Record<string, number>,
  baseCurrency: string,
  filename: string
): Promise<StandardisedTransaction[]> => {
  const runDate = DateTime.now().setZone('Europe/London');

  return transactions.map(transaction => {
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
      const originalDateTime = DateTime.fromISO(
        `${transaction.Date} ${transaction.Time}`,
        {
          zone: transaction['Time Zone'],
        }
      ).setZone('Europe/London');

      originalDateString = originalDateTime.isValid
        ? originalDateTime.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)
        : `${transaction.Date} ${transaction.Time} (${transaction['Time Zone']})`;
    } catch {
      originalDateString = `${transaction.Date} ${transaction.Time} (${transaction['Time Zone']})`;
    }

    let note = `Automatched from Paypal on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)} from the file ${filename}
Original Paypal Transaction ID: ${transaction['Transaction ID']}
Original Paypal Date: ${originalDateString}
Original Paypal Amount: ${transaction.Gross} ${transaction.Currency}`;

    if (transaction.Currency !== baseCurrency) {
      note += `
Converted from ${transaction.Currency} to ${baseCurrency} at ${rate} on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}`;
    }

    const labels = ['automatched', 'paypal'];
    if (transaction.Currency !== baseCurrency) {
      labels.push('foreign-currency');
    }

    return {
      Date: transactionDateTime,
      Payee: transaction.Name,
      Note: note,
      Amount: Number(transaction.Gross) / rate,
      Labels: labels,
      csvType: CSVType.PAYPAL,
      isForeignCurrency: transaction.Currency !== baseCurrency,
      OriginalCSV: filename,
      paypalTransactionId: transaction['Transaction ID'],
    };
  });
};

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

  const files = fs.readdirSync(inputFolder);
  const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));

  if (csvFiles.length === 0) {
    throw new Error('No CSV files found in the input directory');
  }

  const allTransactions: StandardisedTransaction[] = [];

  for (const filename of csvFiles) {
    const filePath = path.join(inputFolder, filename);
    const csvContent = fs.readFileSync(filePath, 'utf8');

    const parseResult = Papa.parse(csvContent, {
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

    const headers = parseResult.meta.fields || [];
    const csvType = detectCSVType(headers);

    let fileTransactions: StandardisedTransaction[] = [];

    switch (csvType) {
      case CSVType.PAYPAL:
        const paypalTransactions = parseResult.data as PayPalTransaction[];
        const filteredPaypalTransactions = paypalTransactions
          .filter(
            transaction =>
              !excludeDescriptions.includes(transaction.Description)
          )
          .map(transaction => ({ ...transaction, OriginalCSV: filename }));

        const currencyRateCache = await getCurrencyRates(baseCurrency);
        fileTransactions = await processPaypalTransactions(
          filteredPaypalTransactions,
          currencyRateCache,
          baseCurrency,
          filename
        );
        break;

      case CSVType.AMAZON:
        const amazonTransactions = parseResult.data as AmazonTransaction[];
        const validAmazonTransactions = amazonTransactions.filter(
          transaction => {
            if (
              !transaction ||
              !transaction['order id'] ||
              !transaction.total ||
              !transaction.date ||
              transaction['order id'] === 'order id' ||
              transaction.date === 'date'
            ) {
              return false;
            }

            const testDate = DateTime.fromISO(transaction.date);
            if (!testDate.isValid) {
              const testDate2 = DateTime.fromFormat(
                transaction.date,
                'yyyy-MM-dd'
              );
              if (!testDate2.isValid) {
                const testDate3 = DateTime.fromFormat(
                  transaction.date,
                  'dd/MM/yyyy'
                );
                if (!testDate3.isValid) {
                  console.warn(
                    `Skipping Amazon transaction with invalid date: ${transaction.date} in order ${transaction['order id']}`
                  );
                  return false;
                }
              }
            }

            const testAmount = parseFloat(
              transaction.total.replace(/[£,]/g, '')
            );
            if (isNaN(testAmount)) {
              console.warn(
                `Skipping Amazon transaction with invalid amount: ${transaction.total} in order ${transaction['order id']}`
              );
              return false;
            }

            return true;
          }
        );

        if (validAmazonTransactions.length === 0) {
          console.warn(
            `No valid Amazon transactions found in file: ${filename}. Skipping.`
          );
          continue;
        }

        fileTransactions = processAmazonTransactions(
          validAmazonTransactions,
          filename
        );
        break;

      case CSVType.UNKNOWN:
        console.warn(
          `Unknown CSV format detected in file: ${filename}. Skipping.`
        );
        continue;

      default:
        throw new Error(
          `Unsupported CSV type: ${csvType} in file: ${filename}`
        );
    }

    allTransactions.push(...fileTransactions);
  }

  return allTransactions;
};
