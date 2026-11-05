import { useCallback, useEffect, useReducer, useRef } from "react";
import { ticketSalesApi } from "@/services/arca-api";
import { printer } from "@/services/printer";
import {
  initialTicketSaleState,
  loadSalePrices,
  printTicket,
  submitSale,
  ticketSaleReducer,
  type TicketSaleAction,
  type TicketSaleViewModel,
} from "./ticket-sale";

export function useTicketSale(): TicketSaleViewModel {
  const [state, rawDispatch] = useReducer(
    ticketSaleReducer,
    initialTicketSaleState,
  );
  // Espejo síncrono del estado para ignorar una doble pulsación (CA-07).
  const latest = useRef(state);

  const dispatch = useCallback((action: TicketSaleAction) => {
    latest.current = ticketSaleReducer(latest.current, action);
    rawDispatch(action);
  }, []);

  useEffect(() => {
    let active = true;

    void loadSalePrices(ticketSalesApi, dispatch, () => active);

    return () => {
      active = false;
    };
  }, [dispatch]);

  return {
    state,
    actions: {
      changeQuantity: (field, value) =>
        dispatch({ type: "quantity-changed", field, value }),
      requestConfirmation: () => dispatch({ type: "confirmation-requested" }),
      cancelConfirmation: () => dispatch({ type: "confirmation-cancelled" }),
      confirm: () => void submitSale(ticketSalesApi, dispatch, () => latest.current),
      print: () => void printTicket(printer, latest.current),
      newSale: () => dispatch({ type: "new-sale" }),
      reloadPrices: () => void loadSalePrices(ticketSalesApi, dispatch),
    },
  };
}
