import type {
  AdminApi,
  ReportExportFormat,
  TicketReportDto,
  TicketReportQuery,
} from "./admin-types";
import { describeApiError } from "./api-errors";
import type { SaveFile } from "@/services/save-file";

export type TicketReportState = {
  status: "loading" | "ready" | "error";
  report: TicketReportDto | null;
  error: string;
  query: TicketReportQuery;
  exporting: ReportExportFormat | null;
  exportError: string;
};

export type TicketReportAction =
  | { type: "query-changed"; changes: Partial<TicketReportQuery> }
  | { type: "load-started" }
  | { type: "loaded"; report: TicketReportDto }
  | { type: "load-failed"; message: string }
  | { type: "export-started"; format: ReportExportFormat }
  | { type: "export-finished" }
  | { type: "export-failed"; message: string };

export type TicketReportDispatch = (action: TicketReportAction) => void;

export const initialTicketReportState: TicketReportState = {
  status: "loading",
  report: null,
  error: "",
  query: { period: "week", page: 1 },
  exporting: null,
  exportError: "",
};

export function ticketReportReducer(
  state: TicketReportState,
  action: TicketReportAction,
): TicketReportState {
  switch (action.type) {
    case "query-changed":
      return {
        ...state,
        query: { ...state.query, ...action.changes },
        exportError: "",
      };
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return { ...state, status: "ready", report: action.report, error: "" };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    case "export-started":
      return { ...state, exporting: action.format, exportError: "" };
    case "export-finished":
      return { ...state, exporting: null };
    case "export-failed":
      return { ...state, exporting: null, exportError: action.message };
    default:
      return state;
  }
}

/** Cambia a semanal o mensual sobre la fecha de hoy que resuelve la API. */
export function selectPeriod(period: "week" | "month"): Partial<TicketReportQuery> {
  return { period, date: undefined, from: undefined, to: undefined, page: 1 };
}

/**
 * Reenvía `previous_date`/`next_date` conservando el tipo de periodo visible.
 */
export function referenceDateChange(
  query: TicketReportQuery,
  date: string,
): Partial<TicketReportQuery> {
  return { period: query.period, date, from: undefined, to: undefined, page: 1 };
}

export function customRange(from: string, to: string): Partial<TicketReportQuery> {
  return { period: "custom", from, to, date: undefined, page: 1 };
}

export async function loadTicketReport(
  api: AdminApi,
  dispatch: TicketReportDispatch,
  query: TicketReportQuery,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const report = await api.reports.tickets(query);

    if (isCurrent()) dispatch({ type: "loaded", report });
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "load-failed", message: described.message });
    }
  }
}

/** Descarga el archivo del periodo visible; si falla conserva el reporte en pantalla. */
export async function exportTicketReport(
  api: AdminApi,
  dispatch: TicketReportDispatch,
  query: TicketReportQuery,
  format: ReportExportFormat,
  save: SaveFile,
  report: TicketReportDto | null = null,
): Promise<boolean> {
  dispatch({ type: "export-started", format });

  // Misma zona que el reporte visible (la que devolvió la API); un timezone
  // explícito en la consulta prevalece.
  const timezone = query.timezone || report?.period.timezone;
  const exportQuery = timezone ? { ...query, timezone } : query;

  try {
    const file = await api.reports.exportTickets(exportQuery, format);

    save(file);
    dispatch({ type: "export-finished" });

    return true;
  } catch (error) {
    const described = describeApiError(error);

    dispatch(
      described.unauthorized
        ? { type: "export-finished" }
        : { type: "export-failed", message: described.message },
    );

    return false;
  }
}

export type TicketReportViewModel = {
  state: TicketReportState;
  actions: {
    selectPeriod: (period: "week" | "month") => void;
    applyCustomRange: (from: string, to: string) => void;
    goToReferenceDate: (date: string) => void;
    goToPage: (page: number) => void;
    reload: () => void;
    exportAs: (format: ReportExportFormat) => void;
  };
};
