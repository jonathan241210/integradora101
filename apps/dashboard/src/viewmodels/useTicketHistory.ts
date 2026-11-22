import { useEffect, useReducer, useRef, useState } from "react";
import type { FocusDialogAction } from "./focus-target";
import { ticketSalesApi } from "@/services/arca-api";
import { useCancellationReasons } from "./useCancellationReasons";
import { useRunProtected } from "./step-up-context";
import {
  cancelTargetForFocus,
  cancelTicket,
  effectiveHistoryQuery,
  initialTicketHistoryState,
  loadTicketHistory,
  ticketHistoryReducer,
  type TicketHistoryViewModel,
} from "./ticket-history";

/** Folio elegido en el buscador global (dashboard-012 CA-21). */
export type TicketHistoryFocus = { folio: string; nonce: number; action?: FocusDialogAction } | null;

export function useTicketHistory(focus: TicketHistoryFocus = null): TicketHistoryViewModel {
  const [state, dispatch] = useReducer(
    ticketHistoryReducer,
    initialTicketHistoryState,
  );
  const generation = useRef(0);
  const protect = useRunProtected();
  const openedNonce = useRef<number | null>(null);
  // El folio del buscador se pide aparte: el formulario de filtros no cambia.
  const [focusedFolio, setFocusedFolio] = useState<string | null>(focus?.folio ?? null);
  const reasons = useCancellationReasons(state.cancel.target !== null);
  const effectiveQuery = effectiveHistoryQuery(state.query, focusedFolio);

  useEffect(() => {
    if (focus) setFocusedFolio(focus.folio);
    // Solo con un nuevo enfoque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  // Abre el diálogo de cancelación de la fila localizada sin cancelar (CA-37, CA-38).
  useEffect(() => {
    if (!focus || state.status !== "ready" || openedNonce.current === focus.nonce) return;
    const target = cancelTargetForFocus(state.rows, focus);

    if (target) {
      openedNonce.current = focus.nonce;
      dispatch({ type: "cancel-opened", target });
    }
    // Solo con un nuevo enfoque o cuando llega la lista.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce, state.status, state.rows]);

  useEffect(() => {
    const mine = ++generation.current;

    void loadTicketHistory(
      ticketSalesApi,
      dispatch,
      effectiveQuery,
      () => generation.current === mine,
    );

    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.query, focusedFolio]);

  return {
    state,
    reasons,
    actions: {
      applyFilters: (filters) => {
        setFocusedFolio(null);
        dispatch({
          type: "query-changed",
          changes: {
            folio: filters.folio,
            status: filters.status,
            from: filters.from,
            to: filters.to,
            page: 1,
          },
        });
      },
      goToPage: (page) => {
        setFocusedFolio(null);
        dispatch({ type: "query-changed", changes: { page } });
      },
      reload: () => {
        const mine = ++generation.current;

        void loadTicketHistory(
          ticketSalesApi,
          dispatch,
          effectiveQuery,
          () => generation.current === mine,
        );
      },
      openCancel: (target) => dispatch({ type: "cancel-opened", target }),
      closeCancel: () => dispatch({ type: "cancel-closed" }),
      changeReasonCode: (reasonCode) =>
        dispatch({ type: "cancel-reason-code-changed", reasonCode }),
      changeReason: (reason) =>
        dispatch({ type: "cancel-reason-changed", reason }),
      confirmCancel: () => {
        const target = state.cancel.target;

        if (!target || state.cancel.busy) return;

        const mine = ++generation.current;

        void cancelTicket(
          ticketSalesApi,
          dispatch,
          target,
          {
            reasonCode: state.cancel.reasonCode,
            reason: state.cancel.reason,
            reasons: reasons.state.reasons,
          },
          effectiveQuery,
          () => generation.current === mine,
          protect,
        );
      },
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
    },
  };
}
