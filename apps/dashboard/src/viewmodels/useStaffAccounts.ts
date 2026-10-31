import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  confirmStaffDialog,
  createStaffAccount,
  initialStaffState,
  loadStaffAccounts,
  loadStaffOptions,
  staffAccountsReducer,
  toStaffCreateInput,
  toStaffUpdateInput,
  updateStaffAccount,
  type StaffAccountsViewModel,
} from "./staff-accounts";

export function useStaffAccounts(): StaffAccountsViewModel {
  const [state, dispatch] = useReducer(staffAccountsReducer, initialStaffState);

  useEffect(() => {
    void loadStaffOptions(adminApi, dispatch);
  }, []);

  useEffect(() => {
    let current = true;

    void loadStaffAccounts(adminApi, dispatch, state.query, false, () => current);

    return () => {
      current = false;
    };
  }, [state.query]);

  const reload = () => loadStaffAccounts(adminApi, dispatch, state.query, true);

  return {
    state,
    actions: {
      changeQuery: (changes) => dispatch({ type: "query-changed", changes }),
      reload: () => void loadStaffAccounts(adminApi, dispatch, state.query),
      openDialog: (dialog) => dispatch({ type: "dialog-opened", dialog }),
      closeDialog: () => dispatch({ type: "dialog-closed" }),
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      create: (values) =>
        void createStaffAccount(adminApi, dispatch, toStaffCreateInput(values), reload),
      update: (account, values) =>
        void updateStaffAccount(
          adminApi,
          dispatch,
          account,
          toStaffUpdateInput(values),
          reload,
        ),
      confirm: (password) =>
        void confirmStaffDialog(adminApi, dispatch, state.dialog, password, reload),
    },
  };
}
