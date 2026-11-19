import { useEffect, useReducer, useRef } from "react";
import type { FocusDialogAction } from "./focus-target";
import { adminApi } from "@/services/arca-api";
import {
  confirmStaffAction,
  emptyStaffForm,
  initialStaffState,
  loadStaffAccounts,
  loadStaffOptions,
  pendingActionForFocus,
  saveStaffAccount,
  staffAccountsReducer,
  staffDepartmentChanges,
  staffFormFromAccount,
  type StaffAccountsViewModel,
} from "./staff-accounts";

/** Cuenta elegida en el buscador global (dashboard-012 CA-38). */
export type StaffFocus = { id: number; nonce: number; action?: FocusDialogAction } | null;

export function useStaffAccounts(focus: StaffFocus = null): StaffAccountsViewModel {
  const [state, dispatch] = useReducer(staffAccountsReducer, initialStaffState);
  const openedNonce = useRef<number | null>(null);

  // Abre la confirmación de la acción elegida sin ejecutarla (CA-37, CA-38).
  useEffect(() => {
    if (!focus || state.status !== "ready" || openedNonce.current === focus.nonce) return;
    const action = pendingActionForFocus(state.items, focus);

    if (action) {
      openedNonce.current = focus.nonce;
      dispatch({ type: "action-opened", action });
    }
    // Solo con un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, state.status, state.items]);

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
