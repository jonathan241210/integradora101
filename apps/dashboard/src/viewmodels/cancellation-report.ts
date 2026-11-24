import type {
  AdminApi,
  CancellationCashierOption,
  CancellationReportDto,
  CancellationReportQuery,
  ReportExportFormat,
  ReportPeriodType,
} from "./admin-types";
import { describeApiError } from "./api-errors";
import type { CancellationReasonCode, CancellationReasonDto } from "./ticket-types";
import { sameQueryExceptPage, ticketFocusQuery, type TicketFocus, type TicketFocusTarget } from "./cancellation-ticket-focus";
import type { SaveFile } from "@/services/save-file";

/**
 * Reporte de cancelaciones (dashboard-016). La API calcula totales, conciliación, minutos,
 * porcentajes y señales (`api-022`); aquí solo hay estado de consulta, mapeo de errores y
 * descarga. El cliente no envía zona horaria (`api-025` RN-04).
 */

export type CancellationReportStatus = "loading" | "ready" | "error" | "forbidden";

export type CancellationReportState = {
  status: CancellationReportStatus;
  report: CancellationReportDto | null;
  /** Mensaje de la API para el estado `error` o `forbidden`. */
  error: string;
  /** 422 de periodo o filtros, por campo (CA-05). */
  fieldErrors: Record<string, string[]>;
  query: CancellationReportQuery;
  cashiers: CancellationCashierOption[];
  exporting: ReportExportFormat | null;
  exportError: string;
  /** 422 de la exportación (formato o tope de PDF), junto al selector (CA-17). */
  exportFieldErrors: Record<string, string[]>;
  /** Filtro automático de «Ver boletos» (dashboard-021 CA-29, CA-30); `null` si no hay. */
  ticketFocus: TicketFocus | null;
};

export type CancellationReportAction =
  | { type: "query-changed"; query: CancellationReportQuery }
  | { type: "ticket-focus-applied"; target: TicketFocusTarget }
  | { type: "ticket-focus-cleared" }
  | { type: "load-started" }
  | { type: "loaded"; report: CancellationReportDto }
  | {
      type: "load-failed";
      message: string;
      forbidden: boolean;
      fieldErrors: Record<string, string[]>;
    }
  | { type: "cashiers-loaded"; cashiers: CancellationCashierOption[] }
  | { type: "export-started"; format: ReportExportFormat }
  | { type: "export-finished" }
  | { type: "export-failed"; message: string; fieldErrors: Record<string, string[]> };

export type CancellationReportDispatch = (action: CancellationReportAction) => void;

/** Valor por defecto: «Semana»; sin fecha, la API toma hoy en su zona de negocio (CA-04). */
export const initialCancellationReportState: CancellationReportState = {
  status: "loading",
  report: null,
  error: "",
  fieldErrors: {},
  query: { period: "week" },
  cashiers: [],
  exporting: null,
  exportError: "",
  exportFieldErrors: {},
  ticketFocus: null,
};

export function cancellationReportReducer(
  state: CancellationReportState,
  action: CancellationReportAction,
): CancellationReportState {
  switch (action.type) {
    case "query-changed":
      return {
        ...state,
        query: action.query,
        fieldErrors: {},
        exportError: "",
        exportFieldErrors: {},
        // Cambiar de página conserva el filtro automático; cualquier otro cambio lo descarta.
        ticketFocus:
          state.ticketFocus && sameQueryExceptPage(state.query, action.query)
            ? state.ticketFocus
            : null,
      };
    case "ticket-focus-applied":
      // Pasa a «cargando» de inmediato para no desplazar sobre el reporte anterior (CA-31).
      return {
        ...state,
        status: "loading",
        query: ticketFocusQuery(action.target),
        fieldErrors: {},
        exportError: "",
        exportFieldErrors: {},
        ticketFocus: {
          ...action.target,
          previousQuery: state.ticketFocus?.previousQuery ?? state.query,
        },
      };
    case "ticket-focus-cleared":
      // Restaura los filtros previos (CA-30).
      return state.ticketFocus
        ? {
            ...state,
            status: "loading",
            query: state.ticketFocus.previousQuery,
            fieldErrors: {},
            exportError: "",
            exportFieldErrors: {},
            ticketFocus: null,
          }
        : state;
    case "load-started":
      return { ...state, status: "loading", error: "", fieldErrors: {} };
    case "loaded":
      return { ...state, status: "ready", report: action.report, error: "", fieldErrors: {} };
    case "load-failed":
      // Un 403 no deja filas ni totales (CA-02); un 422 conserva el reporte anterior.
      return {
        ...state,
        status: action.forbidden ? "forbidden" : "error",
        report: action.forbidden ? null : state.report,
        error: action.message,
        fieldErrors: action.fieldErrors,
      };
    case "cashiers-loaded":
      return { ...state, cashiers: action.cashiers };
    case "export-started":
      return { ...state, exporting: action.format, exportError: "", exportFieldErrors: {} };
    case "export-finished":
      return { ...state, exporting: null };
    case "export-failed":
      return {
        ...state,
        exporting: null,
        exportError: Object.keys(action.fieldErrors).length > 0 ? "" : action.message,
        exportFieldErrors: action.fieldErrors,
      };
    default:
      return state;
  }
}

export type CancellationFilters = {
  period: ReportPeriodType;
  date: string;
  from: string;
  to: string;
  cashierId: string;
  reasonCode: string;
};

export const emptyCancellationFilters: CancellationFilters = {
  period: "week",
  date: "",
  from: "",
  to: "",
  cashierId: "",
  reasonCode: "",
};

/** Convierte lo elegido en la consulta a la API; solo envía lo que aplica al periodo. */
export function buildCancellationQuery(filters: CancellationFilters): CancellationReportQuery {
  const query: CancellationReportQuery = { period: filters.period };

  if (filters.period === "custom") {
    if (filters.from) query.from = filters.from;
    if (filters.to) query.to = filters.to;
  } else if (filters.date) {
    query.date = filters.date;
  }

  const cashierId = Number(filters.cashierId);

  if (filters.cashierId && Number.isInteger(cashierId)) query.cashier_id = cashierId;
  if (filters.reasonCode) query.reason_code = filters.reasonCode as CancellationReasonCode;

  return query;
}

/** Filtros del formulario a partir de la consulta vigente (para navegar de periodo). */
export function filtersFromQuery(query: CancellationReportQuery): CancellationFilters {
  return {
    period: query.period,
    date: query.date ?? "",
    from: query.from ?? "",
    to: query.to ?? "",
    cashierId: query.cashier_id === undefined ? "" : String(query.cashier_id),
    reasonCode: query.reason_code ?? "",
  };
}

/**
 * Opciones del filtro «Motivo»: el catálogo de la API; si el rol no puede leerlo, los motivos
 * que ya trae el reporte. Nada fijo en el cliente.
 */
export function reasonFilterOptions(
  catalog: CancellationReasonDto[],
  report: CancellationReportDto | null,
): { code: string; label: string }[] {
  if (catalog.length > 0) return catalog.map(({ code, label }) => ({ code, label }));

  const seen = new Map<string, string>();

  for (const item of report?.totals.by_reason ?? []) {
    if (item.reason_code) seen.set(item.reason_code, item.reason_label);
  }

  return Array.from(seen, ([code, label]) => ({ code, label }));
}

/** Consulta la API; nunca filtra ni recalcula en el cliente. Sin reintento automático. */
export async function loadCancellationReport(
  api: AdminApi,
  dispatch: CancellationReportDispatch,
  query: CancellationReportQuery,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const report = await api.reports.cancellations(query);

    if (isCurrent()) dispatch({ type: "loaded", report });
  } catch (error) {
    const described = describeApiError(error);

    // El 401 lo atiende el manejador global de sesión (CA-03).
    if (isCurrent() && !described.unauthorized) {
      dispatch({
        type: "load-failed",
        message: described.message,
        forbidden: described.forbidden,
        fieldErrors: described.fieldErrors,
      });
    }
  }
}

/** Lista de cajeros del filtro, de la API (CA-06). Si falla, el filtro queda en «Todos». */
export async function loadCancellationCashiers(
  api: AdminApi,
  dispatch: CancellationReportDispatch,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  try {
    const cashiers = await api.reports.cancellationCashiers();

    if (isCurrent()) dispatch({ type: "cashiers-loaded", cashiers });
  } catch {
    // Sin lista el filtro de cajero no ofrece opciones; el reporte sigue disponible.
  }
}

/** Descarga con los mismos filtros; el nombre del archivo lo da la API (CA-16, CA-17). */
export async function exportCancellationReport(
  api: AdminApi,
  dispatch: CancellationReportDispatch,
  query: CancellationReportQuery,
  format: ReportExportFormat,
  save: SaveFile,
): Promise<boolean> {
  dispatch({ type: "export-started", format });

  try {
    save(await api.reports.exportCancellations(query, format));
    dispatch({ type: "export-finished" });

    return true;
  } catch (error) {
    const described = describeApiError(error);

    dispatch(
      described.unauthorized
        ? { type: "export-finished" }
        : {
            type: "export-failed",
            message: described.message,
            fieldErrors: described.fieldErrors,
          },
    );

    return false;
  }
}

/**
 * Presentación del nivel (CA-01, accesibilidad): el color nunca va solo, siempre hay texto
 * (`traffic_light_label` de la API) e icono. No decide el nivel; solo elige el estilo.
 */
export function trafficLightPresentation(level: string | null): {
  tone: "success" | "warning" | "danger" | "neutral";
  icon: "check" | "info" | "alert";
} {
  if (level === "attention") return { tone: "danger", icon: "alert" };
  if (level === "review") return { tone: "warning", icon: "info" };
  if (level === "normal") return { tone: "success", icon: "check" };

  return { tone: "neutral", icon: "info" };
}

export type CancellationReportViewModel = {
  state: CancellationReportState;
  /** Opciones del filtro «Motivo»; vienen de la API. */
  reasonOptions: { code: string; label: string }[];
  actions: {
    applyFilters: (filters: CancellationFilters) => void;
    goToReferenceDate: (date: string) => void;
    /** Cambia de página de filas; los totales y la conciliación no cambian (api-022 CA-27). */
    goToPage: (page: number) => void;
    /** «Ver boletos» del semáforo: filtra por día y cajero (dashboard-021 CA-29). */
    viewTickets: (target: TicketFocusTarget) => void;
    /** «Quitar filtro»: restaura los filtros previos (dashboard-021 CA-30). */
    clearTicketFocus: () => void;
    reload: () => void;
    exportAs: (format: ReportExportFormat) => void;
  };
};
