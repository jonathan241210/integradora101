import { useEffect, useReducer, useRef } from "react";
import { ticketSalesApi } from "@/services/arca-api";
import {
  cancelTicket,
  initialTicketHistoryState,
  loadTicketHistory,
  ticketHistoryReducer,
  type TicketHistoryViewModel,
} from "./ticket-history";

export function useTicketHistory(): TicketHistoryViewModel {
  const [state, dispatch] = useReducer(
    ticketHistoryReducer,
    initialTicketHistoryState,
  );
  const generation = useRef(0);

  useEffect(() => {
    const mine = ++generation.current;

    void loadTicketHistory(
      ticketSalesApi,
      dispatch,
      state.query,
      () => generation.current === mine,
    );

    return () => {
      generation.current += 1;
    };
  }, [state.query]);

  return {
    state,
    actions: {
      applyFilters: (filters) =>
        dispatch({
          type: "query-changed",
          changes: {
            folio: filters.folio,
            status: filters.status,
            from: filters.from,
            to: filters.to,
            page: 1,
          },
        }),
      goToPage: (page) =>
        dispatch({ type: "query-changed", changes: { page } }),
      reload: () => {
        const mine = ++generation.current;

        void loadTicketHistory(
          ticketSalesApi,
          dispatch,
          state.query,
          () => generation.current === mine,
        );
      },
      openCancel: (target) => dispatch({ type: "cancel-opened", target }),
      closeCancel: () => dispatch({ type: "cancel-closed" }),
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
          state.cancel.reason,
          state.query,
          () => generation.current === mine,
        );
      },
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
    },
  };
}
