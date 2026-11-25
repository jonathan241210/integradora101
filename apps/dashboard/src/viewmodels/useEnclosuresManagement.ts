import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { FocusDialogAction } from "./focus-target";
import { adminApi } from "@/services/arca-api";
import { useRunProtected } from "./step-up-context";
import {
  enclosuresReducer,
  initialEnclosuresState,
  loadEnclosures,
  loadEnclosureAnimals,
  saveEnclosure,
  clampPage,
  deleteEnclosure,
  defaultEnclosureFilters,
  enclosureFocusPage,
  filterEnclosures,
  setEnclosureStatus,
  enclosurePage,
  enclosureDialogForFocus,
  enclosurePageCount,
  pageAfterCreate,
  qrDialogForCard,
  type EnclosuresViewModel,
} from "./enclosures-management";

export type EnclosuresFocus = { id: number; nonce: number; action?: FocusDialogAction } | null;

export function useEnclosuresManagement(
  canManage = true,
  focus: EnclosuresFocus = null,
): EnclosuresViewModel {
  const [state, dispatch] = useReducer(enclosuresReducer, initialEnclosuresState);
  const protect = useRunProtected();

  const [requestedPage, setRequestedPage] = useState(1);
  const [filters, setFilters] = useState(defaultEnclosureFilters);
  const matchingItems = useMemo(
    () => filterEnclosures(state.items, filters, canManage),
    [state.items, filters, canManage],
  );
  const focusedNonce = useRef<number | null>(null);
  const openedNonce = useRef<number | null>(null);
  const previousItems = useRef<typeof state.items | null>(null);
  const pageCount = enclosurePageCount(matchingItems.length);
  const page = clampPage(requestedPage, pageCount);

  useEffect(() => {
    void loadEnclosures(adminApi, dispatch);
  }, []);

  useEffect(() => {
    if (state.dialog?.kind === "animals") {
      return loadEnclosureAnimals(adminApi, dispatch, state.dialog);
    }
  }, [state.dialog]);

  useEffect(() => {
    const previous = previousItems.current;
    previousItems.current = state.items;

    if (previous !== null && previous !== state.items) {
      setRequestedPage((current) => pageAfterCreate(previous, matchingItems, current));
    }
  }, [state.items, matchingItems]);

  // Buscador global (CA-20): salta a la página que contiene el recinto buscado.
  useEffect(() => {
    if (!focus || state.status !== "ready" || focusedNonce.current === focus.nonce) return;
    const target = enclosureFocusPage(state.items, matchingItems, focus.id);
    if (!target) return;

    focusedNonce.current = focus.nonce;
    if (target.clearFilters) setFilters(defaultEnclosureFilters);
    setRequestedPage(target.page);
  }, [focus, state.status, state.items, matchingItems]);

  // Abre la confirmación de la acción elegida sin ejecutarla (CA-37, CA-38).
  useEffect(() => {
    if (!focus || !canManage || state.status !== "ready" || openedNonce.current === focus.nonce) return;
    const dialog = enclosureDialogForFocus(state.items, focus);

    if (dialog) {
      openedNonce.current = focus.nonce;
      dispatch({ type: "dialog-opened", dialog });
    }
    // Solo con un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, state.status, state.items]);

  return {
    canManage,
    filters,
    total: matchingItems.length,
    page,
    pageCount,
    pageItems: enclosurePage(matchingItems, page),
    state,
    actions: {
      changeFilters: (next) => {
        setFilters(next);
        setRequestedPage(1);
      },
      goToPage: (next) => setRequestedPage(clampPage(next, pageCount)),
      reload: () => void loadEnclosures(adminApi, dispatch),
      openDialog: (dialog) => dispatch({ type: "dialog-opened", dialog }),
      closeDialog: () => dispatch({ type: "dialog-closed" }),
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
      toggleStatus: (item) => dispatch({ type: "dialog-opened", dialog: { kind: "status", item } }),
      openQr: (item) => dispatch({ type: "dialog-opened", dialog: qrDialogForCard(item) }),
      setHasQr: (id, hasQr) => dispatch({ type: "qr-status-set", id, hasQr }),
      qrNotFound: (message) => {
        dispatch({ type: "dialog-closed" });
        dispatch({ type: "refresh-failed", message });
        void loadEnclosures(adminApi, dispatch, true);
      },
      requestDelete: (item) => dispatch({ type: "dialog-opened", dialog: { kind: "delete", item } }),
      confirm: () => {
        const { dialog } = state;

        if (dialog?.kind === "status") {
          void setEnclosureStatus(adminApi, dispatch, dialog.item, !dialog.item.is_active);
        }
        if (dialog?.kind === "delete") void deleteEnclosure(adminApi, dispatch, dialog.item, protect);
      },
      save: (name) => void saveEnclosure(adminApi, dispatch, state.dialog, name),
    },
  };
}
