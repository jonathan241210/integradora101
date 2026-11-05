import { describeApiError } from "./api-errors";
import type {
  PageMeta,
  TicketHistoryQuery,
  TicketHistoryRowDto,
  TicketSalesApi,
  TicketStatus,
} from "./ticket-types";

/**
 * Fecha y hora `dd/mm/aaaa HH:mm` en la zona indicada (por defecto la del
 * dispositivo) a partir de un instante ISO 8601 UTC (dashboard-005 CA-13).
 * Es conversión de presentación: no calcula periodos ni días de cancelación.
 */
export function formatTicketDateTime(
  iso: string | null | undefined,
  timeZone?: string,
): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  try {
    const parts = new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).formatToParts(date);
    const part = (type: string) =>
      parts.find((item) => item.type === type)?.value ?? "";

    return `${part("day")}/${part("month")}/${part("year")} ${part("hour")}:${part("minute")}`;
  } catch {
    return iso;
  }
}

export const cancelReasonRequiredMessage = "Indica el motivo de la cancelación.";

export type TicketStatusFilter = TicketStatus | "";

export type TicketHistoryFilters = {
  folio: string;
  status: TicketStatusFilter;
  from: string;
  to: string;
};

export type TicketHistoryState = {
  status: "loading" | "ready" | "empty" | "error";
  rows: TicketHistoryRowDto[];
  meta: PageMeta | null;
  error: string;
  query: TicketHistoryQuery;
  notice: string;
  cancel: {
    target: TicketHistoryRowDto | null;
    reason: string;
    busy: boolean;
    error: string;
    fieldErrors: Record<string, string[]>;
  };
};

export type TicketHistoryAction =
  | { type: "query-changed"; changes: Partial<TicketHistoryQuery> }
  | { type: "load-started" }
  | { type: "loaded"; rows: TicketHistoryRowDto[]; meta: PageMeta }
  | { type: "load-failed"; message: string }
  | { type: "cancel-opened"; target: TicketHistoryRowDto }
  | { type: "cancel-closed" }
  | { type: "cancel-reason-changed"; reason: string }
  | { type: "cancel-started" }
  | {
      type: "cancel-failed";
      message: string;
      fieldErrors: Record<string, string[]>;
    }
  | { type: "cancel-aborted" }
  | { type: "cancelled"; notice: string }
  | { type: "notice-dismissed" };

export type TicketHistoryDispatch = (action: TicketHistoryAction) => void;

const idleCancel: TicketHistoryState["cancel"] = {
  target: null,
  reason: "",
  busy: false,
  error: "",
  fieldErrors: {},
};

export const initialTicketHistoryState: TicketHistoryState = {
  status: "loading",
  rows: [],
  meta: null,
  error: "",
  query: { page: 1 },
  notice: "",
  cancel: idleCancel,
};

export function ticketHistoryReducer(
  state: TicketHistoryState,
  action: TicketHistoryAction,
): TicketHistoryState {
  switch (action.type) {
    case "query-changed":
      return {
        ...state,
        query: { ...state.query, ...action.changes },
        notice: "",
      };
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return {
        ...state,
        status: action.rows.length === 0 ? "empty" : "ready",
        rows: action.rows,
        meta: action.meta,
        error: "",
      };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    case "cancel-opened":
      return { ...state, notice: "", cancel: { ...idleCancel, target: action.target } };
    case "cancel-closed":
      return state.cancel.busy ? state : { ...state, cancel: idleCancel };
    case "cancel-reason-changed":
      return {
        ...state,
        cancel: {
          ...state.cancel,
          reason: action.reason,
          error: "",
          fieldErrors: {},
        },
      };
    case "cancel-started":
      return {
        ...state,
        cancel: { ...state.cancel, busy: true, error: "", fieldErrors: {} },
      };
    case "cancel-failed":
      return {
        ...state,
        cancel: {
          ...state.cancel,
          busy: false,
          // El mensaje general solo aparece cuando no hay uno por campo.
          error: Object.keys(action.fieldErrors).length > 0 ? "" : action.message,
          fieldErrors: action.fieldErrors,
        },
      };
    case "cancel-aborted":
      return { ...state, cancel: idleCancel };
    case "cancelled":
      return { ...state, notice: action.notice, cancel: idleCancel };
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

/** Consulta la API con los filtros y la página; nunca filtra en el cliente. */
export async function loadTicketHistory(
  api: TicketSalesApi,
  dispatch: TicketHistoryDispatch,
  query: TicketHistoryQuery,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const page = await api.history.list(query);

    if (isCurrent()) {
      dispatch({ type: "loaded", rows: page.data, meta: page.meta });
    }
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "load-failed", message: described.message });
    }
  }
}

/**
 * Cancela con motivo obligatorio (RN-03, RN-13). Sin motivo no llama a la API.
 * Tras el 200 refresca la lista con los mismos filtros.
 */
export async function cancelTicket(
  api: TicketSalesApi,
  dispatch: TicketHistoryDispatch,
  target: TicketHistoryRowDto,
  reason: string,
  query: TicketHistoryQuery,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  const trimmed = reason.trim();

  if (!trimmed) {
    dispatch({
      type: "cancel-failed",
      message: cancelReasonRequiredMessage,
      fieldErrors: { reason: [cancelReasonRequiredMessage] },
    });

    return false;
  }

  dispatch({ type: "cancel-started" });

  try {
    await api.history.cancel(target.folio, { reason: trimmed });
  } catch (error) {
    const described = describeApiError(error);

    dispatch(
      described.unauthorized
        ? { type: "cancel-aborted" }
        : {
            type: "cancel-failed",
            message: described.message,
            fieldErrors: described.fieldErrors,
          },
    );

    return false;
  }

  dispatch({
    type: "cancelled",
    notice: `El boleto ${target.folio} se canceló.`,
  });
  await loadTicketHistory(api, dispatch, query, isCurrent);

  return true;
}

export type TicketHistoryViewModel = {
  state: TicketHistoryState;
  actions: {
    applyFilters: (filters: TicketHistoryFilters) => void;
    goToPage: (page: number) => void;
    reload: () => void;
    openCancel: (target: TicketHistoryRowDto) => void;
    closeCancel: () => void;
    changeReason: (reason: string) => void;
    confirmCancel: () => void;
    dismissNotice: () => void;
  };
};
