import { describeApiError } from "./api-errors";
import type { ConfirmationCopy } from "./confirmation";
import type {
  TicketPriceCurrentDto,
  TicketSaleDto,
  TicketSalesApi,
} from "./ticket-types";

export type TicketSaleStep = "idle" | "confirming" | "submitting" | "done" | "error";

export const saleUncertainMessage =
  "No se pudo confirmar si la venta se registró. Consulta el Historial antes de volver a vender.";
export const noQuantityMessage = "Indica al menos un boleto de adulto o de niño.";

export type TicketSaleState = {
  step: TicketSaleStep;
  /** Texto de los campos numéricos; se interpreta con `parseQuantity`. */
  adults: string;
  children: string;
  ticket: TicketSaleDto | null;
  error: string;
  fieldErrors: Record<string, string[]>;
  prices: {
    status: "loading" | "ready" | "error";
    current: TicketPriceCurrentDto | null;
    error: string;
  };
};

export type TicketSaleAction =
  | { type: "quantity-changed"; field: "adults" | "children"; value: string }
  | { type: "confirmation-requested" }
  | { type: "confirmation-cancelled" }
  | { type: "submit-started" }
  | { type: "submit-aborted" }
  | { type: "sold"; ticket: TicketSaleDto }
  | { type: "submit-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "new-sale" }
  | { type: "prices-loaded"; current: TicketPriceCurrentDto }
  | { type: "prices-failed"; message: string };

export type TicketSaleDispatch = (action: TicketSaleAction) => void;

export const initialTicketSaleState: TicketSaleState = {
  step: "idle",
  adults: "0",
  children: "0",
  ticket: null,
  error: "",
  fieldErrors: {},
  prices: { status: "loading", current: null, error: "" },
};

/** Entero mayor o igual a cero, o `null` si el texto no lo es. */
export function parseQuantity(text: string): number | null {
  const value = text.trim();

  if (!/^\d{1,6}$/.test(value)) return null;

  return Number(value);
}

/** «Registrar venta» solo se habilita con cantidades válidas y alguna mayor que cero. */
export function canRegisterSale(state: TicketSaleState): boolean {
  const adults = parseQuantity(state.adults);
  const children = parseQuantity(state.children);

  if (adults === null || children === null) return false;

  return adults > 0 || children > 0;
}

export function isSaleBusy(state: TicketSaleState): boolean {
  return state.step === "submitting";
}

export function ticketSaleReducer(
  state: TicketSaleState,
  action: TicketSaleAction,
): TicketSaleState {
  switch (action.type) {
    case "quantity-changed":
      if (state.step === "confirming" || state.step === "submitting" || state.step === "done") {
        return state;
      }
      return {
        ...state,
        step: "idle",
        [action.field]: action.value,
        error: "",
        fieldErrors: {},
      };
    case "confirmation-requested":
      if (state.step !== "idle" && state.step !== "error") return state;
      if (!canRegisterSale(state)) {
        return { ...state, step: "idle", error: noQuantityMessage };
      }
      return { ...state, step: "confirming", error: "", fieldErrors: {} };
    case "confirmation-cancelled":
      return state.step === "confirming" ? { ...state, step: "idle" } : state;
    case "submit-started":
      // Un segundo envío mientras hay uno en curso se ignora (CA-07).
      return state.step === "confirming" ? { ...state, step: "submitting" } : state;
    case "submit-aborted":
      return state.step === "submitting" ? { ...state, step: "idle" } : state;
    case "sold":
      return state.step === "submitting"
        ? { ...state, step: "done", ticket: action.ticket, error: "", fieldErrors: {} }
        : state;
    case "submit-failed":
      return state.step === "submitting"
        ? {
            ...state,
            step: "error",
            ticket: null,
            error: action.message,
            fieldErrors: action.fieldErrors,
          }
        : state;
    case "new-sale":
      return { ...initialTicketSaleState, prices: state.prices };
    case "prices-loaded":
      return {
        ...state,
        prices: { status: "ready", current: action.current, error: "" },
      };
    case "prices-failed":
      return {
        ...state,
        prices: { status: "error", current: null, error: action.message },
      };
    default:
      return state;
  }
}

/** Precios unitarios vigentes tal como los devuelve la API (CA-04). */
export async function loadSalePrices(
  api: TicketSalesApi,
  dispatch: TicketSaleDispatch,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  try {
    const current = await api.prices.current();

    if (isCurrent()) dispatch({ type: "prices-loaded", current });
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "prices-failed", message: described.message });
    }
  }
}

/**
 * Registra la venta tras la confirmación (CA-05 a CA-08). `getState` debe
 * reflejar de inmediato las acciones enviadas para ignorar un segundo envío.
 * Nunca reintenta: un fallo de red o 5xx remite al Historial.
 */
export async function submitSale(
  api: TicketSalesApi,
  dispatch: TicketSaleDispatch,
  getState: () => TicketSaleState,
): Promise<void> {
  const state = getState();

  if (state.step !== "confirming") return;

  const adults = parseQuantity(state.adults);
  const children = parseQuantity(state.children);

  if (adults === null || children === null) return;

  dispatch({ type: "submit-started" });

  try {
    const ticket = await api.sales.create({
      adult_quantity: adults,
      child_quantity: children,
    });

    dispatch({ type: "sold", ticket });
  } catch (error) {
    const described = describeApiError(error);

    if (described.unauthorized) {
      dispatch({ type: "submit-aborted" });

      return;
    }

    const uncertain = described.status === 0 || described.status >= 500;

    dispatch({
      type: "submit-failed",
      message: uncertain ? saleUncertainMessage : described.message,
      fieldErrors: uncertain ? {} : described.fieldErrors,
    });
  }
}

/** Resumen del diálogo de confirmación: cantidades, sin total (decisión 2026-11-02, pregunta 1). */
export function saleConfirmationCopy(
  state: TicketSaleState,
): ConfirmationCopy | null {
  if (state.step !== "confirming" && state.step !== "submitting") return null;

  return {
    title: "Confirmar venta",
    message: "Se registrará una venta en efectivo con las siguientes cantidades.",
    confirmLabel: "Confirmar venta",
    danger: false,
  };
}

/** Imprime el boleto mostrado mediante el servicio inyectado (RN-10). */
export function printTicket(
  printer: { print: () => void },
  state: TicketSaleState,
): boolean {
  if (state.step !== "done" || !state.ticket) return false;

  printer.print();

  return true;
}

/** URI de imagen del QR; el SVG de la API no se inyecta en el DOM (RN-07). */
export function qrSvgDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export type TicketSaleViewModel = {
  state: TicketSaleState;
  actions: {
    changeQuantity: (field: "adults" | "children", value: string) => void;
    requestConfirmation: () => void;
    cancelConfirmation: () => void;
    confirm: () => void;
    print: () => void;
    newSale: () => void;
    reloadPrices: () => void;
  };
};
