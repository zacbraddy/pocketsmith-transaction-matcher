import { Dispatch, useEffect } from "react";
import { Action } from "../actions/action.types";
import { StepTypes, TransactionMatcherState, PayPalTransaction, StandardisedTransaction } from "../types";
import { csvProcessingStart, csvProcessingSuccess, csvProcessingError } from "../actions/csv-processing.actions";
import * as fs from "fs";
import * as path from "path";
import Papa from "papaparse";
import { UnirateClient } from "unirate-api";
import { env } from "@/env";
import { DateTime } from "luxon";
import flatten from "just-flatten-it";

const useProcessingInputsWatcher = (state: TransactionMatcherState, dispatch: Dispatch<Action>) => {
  const doCSVProcessing = async () => {
    const inputFolder = path.join(process.cwd(), "data", "input");

    try {
      // Read all files from the input directory
      const files = fs.readdirSync(inputFolder);
      const csvFiles = files.filter(file => file.toLowerCase().endsWith('.csv'));

      if (csvFiles.length === 0) {
        dispatch(csvProcessingError("No CSV files found in the input directory"));
        return;
      }

      const allTransactions = flatten(csvFiles.map(filename => {
        const filePath = path.join(inputFolder, filename);
        const csvContent = fs.readFileSync(filePath, 'utf8');
        const parseResult = Papa.parse<PayPalTransaction>(csvContent, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header: string) => header.trim(),
          transform: (value: string) => value.trim(),
        });

        if (parseResult.errors.length > 0) {
          dispatch(csvProcessingError(`Errors parsing ${filename}: ${parseResult.errors.map(e => e.message).join(', ')}`));
          return [];
        }


        return parseResult.data.filter(
          transaction =>
            !["Bank Deposit to PP Account", "General Currency Conversion"].includes(transaction.Description)
        ).map(transaction => ({ ...transaction, OriginalCSV: filename }));
      }));

      const client = new UnirateClient(env.unirateApiKey);
      const currencyRateCache = await client.getRate("GBP") as Record<string, number>;

      const runDate = DateTime.now().setZone("Europe/London");

      let csvDataArray: StandardisedTransaction[] = [];

      try {
        csvDataArray = allTransactions.map((transaction) => {
          const currency = transaction.Currency;
          const rate = currencyRateCache[currency];

          if (!rate) {
            dispatch(csvProcessingError(`Rate not found for ${currency}`));
            throw new Error(`Rate not found for ${currency}`);
          }

          return {
            Date: transaction.Date,
            Payee: transaction.Name,
            Note: `Converted from Paypal on ${runDate.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}\nOriginal Paypal Transaction ID: ${transaction["Transaction ID"]}\nOriginal Paypal Date: ${DateTime.fromISO(`${transaction.Date} ${transaction.Time}`, { zone: transaction["Time Zone"] }).setZone("Europe/London").toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS)}\nOriginal Paypal Amount: ${transaction.Gross} ${transaction.Currency}`,
            Amount: Number(transaction.Gross) * rate,
            Labels: ["Paypal Automated Conversion"],
            OriginalCSV: transaction.OriginalCSV
          };
        });
      } catch (error) {
        throw error;
      }

      dispatch(csvProcessingSuccess(csvDataArray));
    } catch (error) {
      dispatch(csvProcessingError(`Error processing CSV files: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  useEffect(() => {
    if (state.currentStep === StepTypes.PROCESSING_INPUTS && !state.transactions) {
      dispatch(csvProcessingStart());

      doCSVProcessing();
    }
  }, [state.currentStep, state.transactions, dispatch]);
};

export default useProcessingInputsWatcher;
