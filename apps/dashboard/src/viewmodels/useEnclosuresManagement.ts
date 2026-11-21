import { useEffect, useReducer, useRef, useState } from "react";
import type { FocusDialogAction } from "./focus-target";
import { adminApi } from "@/services/arca-api";
import {
  enclosuresReducer,
  initialEnclosuresState,
  loadEnclosures,
  saveEnclosure,
  clampPage,
  deleteEnclosure,
  pageOfEnclosure,
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

  const [requestedPage, setRequestedPage] = useState(1);
  const openedNonce = useRef<number | null>(null);
  const previousItems = useRef<typeof state.items | null>(null);
  const pageCount = enclosurePageCount(state.items.length);
  const page = clampPage(requestedPage, pageCount);

  useEffect(() => {
    void loadEnclosures(adminApi, dispatch);
  }, []);

  useEffect(() => {
    const previous = previousItems.current;
    previousItems.current = state.items;

    if (previous !== null && previous !== state.items) {
      setRequestedPage((current) => pageAfterCreate(previous, state.items, current));
    }
  }, [state.items]);

  // Buscador global (CA-20): salta a la página que contiene el recinto buscado.
  useEffect(() => {
    if (!focus || state.status !== "ready") return;
    const target = pageOfEnclosure(state.items, focus.id);

    if (target !== null) setRequestedPage(target);
    // Solo al pedir un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, focus?.id, state.items]);

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
    page,
    pageCount,
    pageItems: enclosurePage(state.items, page),
    state,
    actions: {
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
        if (dialog?.kind === "delete") void deleteEnclosure(adminApi, dispatch, dialog.item);
      },
      save: (name) => void saveEnclosure(adminApi, dispatch, state.dialog, name),
    },
  };
}
