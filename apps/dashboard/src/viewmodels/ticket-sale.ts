import { describeApiError } from "./api-errors";
import type { ConfirmationCopy } from "./confirmation";
import type {
  TicketPriceCurrentDto,
  TicketQuoteDto,
  TicketSaleBatchDto,
  TicketKind,
  TicketSalesApi,
} from "./ticket-types";

export type TicketSaleStep = "idle" | "confirming" | "submitting" | "done" | "error";

export const saleUncertainMessage =
  "No se pudo confirmar si la venta se registró. Consulta el Historial antes de volver a vender.";
export const noQuantityMessage = "Indica al menos un boleto de adulto o de niño.";

export const quoteUncertainMessage =
  "No se pudo calcular el total. Cancela e intenta de nuevo con «Registrar venta».";

/** Cotización del diálogo (CA-05, CA-31 a CA-34). */
export type SaleQuoteState = {
  status: "idle" | "loading" | "ready" | "error";
  /** Identificador de la solicitud vigente; se incrementa al abrir y al cerrar el diálogo (CA-33). */
  requestId: number;
  /** Cantidades enviadas a cotizar; la confirmación usa estas (CA-34). */
  adults: number;
  children: number;
  quote: TicketQuoteDto | null;
  error: string;
};

export const initialSaleQuote: SaleQuoteState = {
  status: "idle",
  requestId: 0,
  adults: 0,
  children: 0,
  quote: null,
  error: "",
};

export type TicketSaleState = {
  step: TicketSaleStep;
  /** Texto de los campos numéricos; se interpreta con `parseQuantity`. */
  adults: string;
  children: string;
  /** Compra registrada: totales y boletos tal como los devuelve la API (CA-35). */
  sale: TicketSaleBatchDto | null;
  error: string;
  fieldErrors: Record<string, string[]>;
  quote: SaleQuoteState;
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
  | { type: "quote-loaded"; requestId: number; quote: TicketQuoteDto }
  | {
      type: "quote-failed";
      requestId: number;
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | { type: "quote-aborted"; requestId: number }
  | { type: "submit-started" }
  | { type: "submit-aborted" }
  | { type: "sold"; sale: TicketSaleBatchDto }
  | { type: "submit-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "new-sale" }
  | { type: "prices-loaded"; current: TicketPriceCurrentDto }
  | { type: "prices-failed"; message: string };

export type TicketSaleDispatch = (action: TicketSaleAction) => void;

export const initialTicketSaleState: TicketSaleState = {
  step: "idle",
  adults: "0",
  children: "0",
  sale: null,
  error: "",
  fieldErrors: {},
  quote: initialSaleQuote,
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

/** Cotización vacía que invalida cualquier solicitud anterior (CA-33). */
function clearedQuote(state: TicketSaleState): SaleQuoteState {
  return { ...initialSaleQuote, requestId: state.quote.requestId + 1 };
}

function isCurrentQuote(state: TicketSaleState, requestId: number): boolean {
  return (
    state.step === "confirming" &&
    state.quote.status === "loading" &&
    state.quote.requestId === requestId
  );
}

/** «Confirmar venta» solo se habilita con la cotización lista (CA-31, CA-32). */
export function canConfirmSale(state: TicketSaleState): boolean {
  return state.step === "confirming" && state.quote.status === "ready";
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
      return {
        ...state,
        step: "confirming",
        error: "",
        fieldErrors: {},
        quote: {
          status: "loading",
          requestId: state.quote.requestId + 1,
          adults: parseQuantity(state.adults) ?? 0,
          children: parseQuantity(state.children) ?? 0,
          quote: null,
          error: "",
        },
      };
    case "confirmation-cancelled":
      // Cerrar invalida la solicitud en curso (CA-33).
      return state.step === "confirming"
        ? {
            ...state,
            step: "idle",
            quote: { ...initialSaleQuote, requestId: state.quote.requestId + 1 },
          }
        : state;
    case "quote-loaded":
      if (!isCurrentQuote(state, action.requestId)) return state;
      return {
        ...state,
        quote: { ...state.quote, status: "ready", quote: action.quote, error: "" },
      };
    case "quote-failed":
      if (!isCurrentQuote(state, action.requestId)) return state;
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        quote: { ...state.quote, status: "error", quote: null, error: action.message },
      };
    case "quote-aborted":
      // 401: el flujo global de sesión se encarga; se cierra el diálogo.
      if (!isCurrentQuote(state, action.requestId)) return state;
      return {
        ...state,
        step: "idle",
        quote: { ...initialSaleQuote, requestId: state.quote.requestId + 1 },
      };
    case "submit-started":
      // Solo con cotización lista (CA-31, CA-32).
      if (state.quote.status !== "ready") return state;
      // Un segundo envío mientras hay uno en curso se ignora (CA-07).
      return state.step === "confirming" ? { ...state, step: "submitting" } : state;
    case "submit-aborted":
      return state.step === "submitting"
        ? { ...state, step: "idle", quote: clearedQuote(state) }
        : state;
    case "sold":
      return state.step === "submitting"
        ? { ...state, step: "done", sale: action.sale, error: "", fieldErrors: {} }
        : state;
    case "submit-failed":
      return state.step === "submitting"
        ? {
            ...state,
            step: "error",
            quote: clearedQuote(state),
            sale: null,
            error: action.message,
            fieldErrors: action.fieldErrors,
          }
        : state;
    case "new-sale":
      return {
        ...initialTicketSaleState,
        quote: { ...initialSaleQuote, requestId: state.quote.requestId + 1 },
        prices: state.prices,
      };
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

  if (state.quote.status !== "ready") return;

  // La venta usa las cantidades cotizadas (CA-34).
  const { adults, children } = state.quote;

  dispatch({ type: "submit-started" });

  try {
    const sale = await api.sales.create({
      adult_quantity: adults,
      child_quantity: children,
    });

    dispatch({ type: "sold", sale });
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

/**
 * Cotiza al abrir el diálogo (CA-05, CA-31 a CA-34). No reintenta (pregunta 9):
 * ante un fallo se cancela y se vuelve a pulsar «Registrar venta». Una respuesta
 * de un diálogo cerrado o de una cotización anterior se ignora por `requestId`.
 */
export async function requestSaleQuote(
  api: TicketSalesApi,
  dispatch: TicketSaleDispatch,
  getState: () => TicketSaleState,
): Promise<void> {
  const before = getState();

  dispatch({ type: "confirmation-requested" });

  const state = getState();

  if (state.step !== "confirming" || state.quote.requestId === before.quote.requestId) {
    return;
  }

  const { requestId, adults, children } = state.quote;

  try {
    const quote = await api.sales.quote({
      adult_quantity: adults,
      child_quantity: children,
    });

    dispatch({ type: "quote-loaded", requestId, quote });
  } catch (error) {
    const described = describeApiError(error);

    if (described.unauthorized) {
      dispatch({ type: "quote-aborted", requestId });

      return;
    }

    const uncertain = described.status === 0 || described.status >= 500;
    const fieldMessage = Object.values(described.fieldErrors).flat()[0];

    dispatch({
      type: "quote-failed",
      requestId,
      message: uncertain ? quoteUncertainMessage : fieldMessage || described.message,
      fieldErrors: uncertain ? {} : described.fieldErrors,
    });
  }
}

/** Resumen del diálogo de confirmación: cantidades, precios, subtotales y total de la API (revisión 2026-11-05, pregunta 1). */
export function saleConfirmationCopy(
  state: TicketSaleState,
): ConfirmationCopy | null {
  if (state.step !== "confirming" && state.step !== "submitting") return null;

  return {
    title: "Confirmar venta",
    message: "Se registrará una venta en efectivo con los importes calculados por el sistema.",
    confirmLabel: "Confirmar venta",
    danger: false,
  };
}

/** Etiqueta en español del tipo de boleto (CA-35, CA-36). */
export function ticketKindLabel(kind: TicketKind): string {
  return kind === "child" ? "Niño" : "Adulto";
}

/** Imprime todos los boletos de la venta mostrada mediante el servicio inyectado (CA-37, RN-10). */
export function printTickets(
  printer: { print: () => void },
  state: TicketSaleState,
): boolean {
  if (state.step !== "done" || !state.sale) return false;

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
