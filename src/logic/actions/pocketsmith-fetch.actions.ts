import { Action, ActionTypes } from "./action.types";
import { StandardisedTransaction } from "../types";
import { DateTime } from "luxon";

export const pocketsmithFetchStart = (dateRange: { startDate?: DateTime; endDate?: DateTime }): Action => ({
  type: ActionTypes.POCKETSMITH_FETCH_START,
  payload: dateRange,
});

export const pocketsmithFetchSuccess = (transactions: StandardisedTransaction[]): Action => ({
  type: ActionTypes.POCKETSMITH_FETCH_SUCCESS,
  payload: transactions,
});

export const pocketsmithFetchError = (error: string): Action => ({
  type: ActionTypes.POCKETSMITH_FETCH_ERROR,
  payload: error,
});
