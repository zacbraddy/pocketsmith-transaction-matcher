import { Action, ActionTypes } from "./action.types";

export const initialisingAction = (): Action => ({
  type: ActionTypes.INITIALISING,
  payload: undefined,
});
