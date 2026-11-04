import { useEffect, useReducer, useRef } from "react";
import { ticketSalesApi } from "@/services/arca-api";
import {
  initialTicketPricesState,
  loadTicketPrices,
  requestPriceConfirmation,
  submitPriceChange,
  ticketPricesReducer,
  type TicketPricesViewModel,
} from "./ticket-prices";

export function useTicketPrices(): TicketPricesViewModel {
  const [state, dispatch] = useReducer(
    ticketPricesReducer,
    initialTicketPricesState,
  );
  const generation = useRef(0);

  useEffect(() => {
    const mine = ++generation.current;

    void loadTicketPrices(
      ticketSalesApi,
      dispatch,
      () => generation.current === mine,
    );

    return () => {
      generation.current += 1;
    };
  }, []);

  return {
    state,
    actions: {
      changeForm: (changes) => dispatch({ type: "form-changed", changes }),
      requestConfirmation: () => requestPriceConfirmation(dispatch, state.form),
      cancelConfirmation: () => dispatch({ type: "confirmation-cancelled" }),
      confirm: () => {
        if (!state.pending || state.saving) return;

        void submitPriceChange(
          ticketSalesApi,
          dispatch,
          state.pending,
          () => generation.current > 0,
        );
      },
      reload: () => {
        const mine = ++generation.current;

        void loadTicketPrices(
          ticketSalesApi,
          dispatch,
          () => generation.current === mine,
        );
      },
      dismissNotice: () => dispatch({ type: "notice-dismissed" }),
    },
  };
}
