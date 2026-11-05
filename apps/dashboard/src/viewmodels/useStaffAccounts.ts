import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  confirmStaffAction,
  emptyStaffForm,
  initialStaffState,
  loadStaffAccounts,
  loadStaffOptions,
  saveStaffAccount,
  staffAccountsReducer,
  staffDepartmentChanges,
  staffFormFromAccount,
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
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      toggleForm: () => dispatch({ type: "panel-toggled" }),
      changeForm: (changes) => dispatch({ type: "form-changed", changes }),
      changeDepartment: (departmentId) =>
        dispatch({ type: "form-changed", changes: staffDepartmentChanges(state, departmentId) }),
      startEdit: (account) =>
        dispatch({ type: "edit-started", item: account, form: staffFormFromAccount(account) }),
      cancelEdit: () => dispatch({ type: "edit-cancelled", form: emptyStaffForm() }),
      submit: () => void saveStaffAccount(adminApi, dispatch, state, reload),
      openAction: (action) => dispatch({ type: "action-opened", action }),
      closeAction: () => dispatch({ type: "action-closed" }),
      confirmAction: (password) =>
        void confirmStaffAction(adminApi, dispatch, state, password, reload),
    },
  };
}
