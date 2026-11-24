import { describeApiError } from "./api-errors";
import { BUSINESS_TIMEZONE_FALLBACK } from "./formatters";
import { commentRequiredFor, type CancellationReasonsViewModel } from "./cancellation-reasons";
import { isStepUpCancelled, runUnprotected, type RunProtected } from "./step-up";
import type {
  CancellationReasonCode,
  CancellationReasonDto,
  PageMeta,
  TicketHistoryQuery,
  TicketHistoryRowDto,
  TicketSalesApi,
  TicketStatus,
} from "./ticket-types";

/**
 * Fecha y hora `dd/mm/aaaa HH:mm` en la zona que informa la API, a partir de un
 * instante ISO 8601 UTC (dashboard-019 RN-01; formato de dashboard-005 CA-13). La
 * zona es obligatoria: el navegador no decide la presentación. Es conversión de
 * presentación: no calcula periodos ni días de cancelación.
 */
export function formatTicketDateTime(
  iso: string | null | undefined,
  timeZone: string,
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

/**
 * Consulta que se pide a la API: con un folio del buscador global se usa el
 * filtro `folio` existente sin tocar `state.query` (el formulario no cambia).
 */
export function effectiveHistoryQuery(
  query: TicketHistoryQuery,
  focusedFolio: string | null,
): TicketHistoryQuery {
  return focusedFolio === null ? query : { ...query, folio: focusedFolio, page: 1 };
}

/** Sin motivo elegido no se llama a la API (dashboard-016 CA-19). */
export const cancelReasonRequiredMessage = "Elige un motivo de cancelación.";
/** Comentario vacío con un motivo que lo exige según el catálogo de la API (CA-20). */
export const cancelCommentRequiredMessage = "Describe el motivo de la cancelación.";

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
  /** Zona de negocio de la última respuesta (`api-025`); respaldo fijo si no llega. */
  timezone: string;
  notice: string;
  cancel: {
    target: TicketHistoryRowDto | null;
    /** Código elegido del catálogo de la API; vacío si aún no se elige. */
    reasonCode: string;
    reason: string;
    busy: boolean;
    error: string;
    fieldErrors: Record<string, string[]>;
  };
};

export type TicketHistoryAction =
  | { type: "query-changed"; changes: Partial<TicketHistoryQuery> }
  | { type: "load-started" }
  | { type: "loaded"; rows: TicketHistoryRowDto[]; meta: PageMeta; timezone?: string }
  | { type: "load-failed"; message: string }
  | { type: "cancel-opened"; target: TicketHistoryRowDto }
  | { type: "cancel-closed" }
  | { type: "cancel-reason-code-changed"; reasonCode: string }
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
  reasonCode: "",
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
  timezone: BUSINESS_TIMEZONE_FALLBACK,
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
        timezone: action.timezone || BUSINESS_TIMEZONE_FALLBACK,
        error: "",
      };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    case "cancel-opened":
      return { ...state, notice: "", cancel: { ...idleCancel, target: action.target } };
    case "cancel-closed":
      return state.cancel.busy ? state : { ...state, cancel: idleCancel };
    case "cancel-reason-code-changed":
      return {
        ...state,
        cancel: {
          ...state.cancel,
          reasonCode: action.reasonCode,
          error: "",
          fieldErrors: {},
        },
      };
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
      dispatch({
        type: "loaded",
        rows: page.data,
        meta: page.meta,
        timezone: page.timezone ?? BUSINESS_TIMEZONE_FALLBACK,
      });
    }
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "load-failed", message: described.message });
    }
  }
}

export type CancelTicketInput = {
  /** Código elegido; vacío si no se eligió. */
  reasonCode: string;
  /** Comentario libre; opcional salvo que el catálogo de la API lo exija. */
  reason: string;
  /** Catálogo de la API: de aquí sale la política de comentario. */
  reasons: CancellationReasonDto[];
};

/**
 * Cancela con motivo de lista obligatorio (dashboard-005 RN-03, dashboard-016 CA-19 a CA-21).
 * Sin motivo no llama a la API. El mínimo de caracteres del comentario lo valida la API
 * (422). Tras el 200 refresca la lista con los mismos filtros.
 */
export async function cancelTicket(
  api: TicketSalesApi,
  dispatch: TicketHistoryDispatch,
  target: TicketHistoryRowDto,
  input: CancelTicketInput,
  query: TicketHistoryQuery,
  isCurrent: () => boolean = () => true,
  protect: RunProtected = runUnprotected,
): Promise<boolean> {
  const trimmed = input.reason.trim();

  if (!input.reasonCode) {
    dispatch({
      type: "cancel-failed",
      message: cancelReasonRequiredMessage,
      fieldErrors: { reason_code: [cancelReasonRequiredMessage] },
    });

    return false;
  }

  if (!trimmed && commentRequiredFor(input.reasons, input.reasonCode)) {
    dispatch({
      type: "cancel-failed",
      message: cancelCommentRequiredMessage,
      fieldErrors: { reason: [cancelCommentRequiredMessage] },
    });

    return false;
  }

  dispatch({ type: "cancel-started" });

  try {
    // Ventana: si la API pide contraseña, se confirma y se reintenta una vez (CA-01, CA-02).
    await protect(() =>
      api.history.cancel(target.folio, {
        reason_code: input.reasonCode as CancellationReasonCode,
        reason: trimmed || null,
      }),
    );
  } catch (error) {
    if (isStepUpCancelled(error)) {
      // Sin petición ni mensaje: el diálogo de cancelación sigue abierto (CA-08).
      dispatch({ type: "cancel-failed", message: "", fieldErrors: {} });

      return false;
    }

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
  /** Catálogo de motivos del diálogo de cancelar (hook `useCancellationReasons`). */
  reasons?: CancellationReasonsViewModel;
  actions: {
    applyFilters: (filters: TicketHistoryFilters) => void;
    goToPage: (page: number) => void;
    reload: () => void;
    openCancel: (target: TicketHistoryRowDto) => void;
    closeCancel: () => void;
    changeReasonCode: (reasonCode: string) => void;
    changeReason: (reason: string) => void;
    confirmCancel: () => void;
    dismissNotice: () => void;
  };
};

/**
 * Boleto por cancelar elegido en el buscador (dashboard-012 CA-38). Solo abre
 * el diálogo; no cancela. `null` si la fila no está cargada o no es cancelable.
 */
export function cancelTargetForFocus(
  rows: TicketHistoryRowDto[],
  focus: { folio: string; action?: string },
): TicketHistoryRowDto | null {
  if (focus.action !== "cancel") return null;

  return rows.find((row) => String(row.folio) === focus.folio && row.cancellable) ?? null;
}
