import type {
  CancellationCashierOption,
  CancellationDaysToReviewDto,
  CancellationLegendDto,
  CancellationReportQuery,
  CancellationRowDto,
  ListPageMeta,
} from "./admin-types";
import { formatDate } from "./formatters";

/**
 * Apoyo de presentación de «Ver boletos» y de los folios por señal (dashboard-021 CA-29 a
 * CA-34 y dashboard-016 CA-32 a CA-35, revisión 2026-11-21 (c)). La API decide qué boletos participan en cada señal
 * (`signal_codes`, `reasons[].folios`); aquí solo se arman consultas, etiquetas y textos de
 * apoyo, sin recomponer la frase de la API.
 */

export type TicketFocusTarget = {
  cashierId: number;
  cashierName: string;
  /** Fecha del día del semáforo (`aaaa-mm-dd`). */
  date: string;
};

export type TicketFocus = TicketFocusTarget & {
  /** Consulta vigente antes de aplicar el filtro, para «Quitar filtro» (CA-30). */
  previousQuery: CancellationReportQuery;
};

/** Consulta de un día y un cajero: periodo personalizado con inicio y fin iguales (CA-29). */
export function ticketFocusQuery(target: TicketFocusTarget): CancellationReportQuery {
  return {
    period: "custom",
    from: target.date,
    to: target.date,
    cashier_id: target.cashierId,
  };
}

/** Dos consultas iguales salvo la página: cambiar de página no quita el filtro (CA-29). */
export function sameQueryExceptPage(
  a: CancellationReportQuery,
  b: CancellationReportQuery,
): boolean {
  const { page: _pageA, ...restA } = a;
  const { page: _pageB, ...restB } = b;

  return JSON.stringify(restA, Object.keys(restA).sort()) === JSON.stringify(restB, Object.keys(restB).sort());
}

/** Texto del banner del filtro automático (CA-29). */
export function ticketFocusBannerText(focus: TicketFocusTarget): string {
  return `Mostrando boletos de ${focus.cashierName} del ${formatDate(focus.date)}`;
}

/** Boleto que participa en alguna señal de su cajero y día; la API manda la lista (CA-31). */
export function hasSignals(row: CancellationRowDto): boolean {
  return row.signal_codes.length > 0;
}

/** Etiqueta corta de una señal: la de la leyenda de la API; sin ella, el código (CA-32). */
export function signalLabel(code: string, legend: CancellationLegendDto[] | undefined): string {
  return legend?.find((item) => item.code === code)?.label ?? code;
}

/** Id del elemento de la fila de un folio, para desplazar y mover el foco (CA-33). */
export function ticketRowAnchorId(folio: number | string): string {
  return `cancellation-ticket-${String(folio).replace(/[^\w-]/g, "_")}`;
}

/** ¿El folio está en la página actual de boletos? (CA-33). */
export function isFolioOnPage(rows: CancellationRowDto[], folio: string): boolean {
  return rows.some((row) => String(row.folio) === folio);
}

/** Tope de filas que se recorren buscando un folio fuera de la página (dashboard-016 CA-33). */
export const FOLIO_SCAN_ROW_LIMIT = 500;

export type FolioScanStep =
  | { status: "found" }
  | { status: "scan"; page: number }
  | { status: "not-found" };

/**
 * Siguiente paso para llevar el foco a un folio con el filtro de día y cajero ya aplicado
 * (CA-33). La API ordena por fecha de venta e id, pero un folio que no llegó en la página no
 * trae su fecha: con los datos que ya llegan no se puede calcular su posición, así que se
 * recorren las páginas en el orden de la API, de la 1 en adelante, sin repetir las ya vistas.
 * El tope sale de `meta.per_page` (`FOLIO_SCAN_ROW_LIMIT` filas) y de `meta.last_page`.
 */
export function nextFolioScanStep(input: {
  rows: CancellationRowDto[];
  meta: Pick<ListPageMeta, "current_page" | "last_page" | "per_page"> | undefined;
  folio: string;
  visited: number[];
}): FolioScanStep {
  if (isFolioOnPage(input.rows, input.folio)) return { status: "found" };

  const { meta } = input;

  if (!meta) return { status: "not-found" };

  const perPage = Math.max(1, meta.per_page);
  const maxPage = Math.min(meta.last_page, Math.ceil(FOLIO_SCAN_ROW_LIMIT / perPage));

  for (let page = 1; page <= maxPage; page += 1) {
    if (page !== meta.current_page && !input.visited.includes(page)) return { status: "scan", page };
  }

  return { status: "not-found" };
}

/** «2 en Atención · 3 en Revisar»; sin días, «Ninguno» (dashboard-016 CA-33). Los conteos son de la API. */
export function formatDaysToReview(days: CancellationDaysToReviewDto | undefined): string {
  if (!days) return "—";

  const parts: string[] = [];

  if (days.attention > 0) parts.push(`${days.attention} en Atención`);
  if (days.review > 0) parts.push(`${days.review} en Revisar`);

  return parts.length > 0 ? parts.join(" · ") : "Ninguno";
}

/** Resumen de los filtros que aplicará la exportación (dashboard-016 CA-34): periodo, cajero y motivo. */
export function describeExportFilters(
  query: CancellationReportQuery,
  periodLabel: string | undefined,
  cashiers: CancellationCashierOption[],
  reasons: { code: string; label: string }[],
): string {
  const cashier =
    query.cashier_id === undefined
      ? "todos"
      : (cashiers.find((item) => item.id === query.cashier_id)?.name ?? `n.º ${query.cashier_id}`);
  const reason =
    query.reason_code === undefined
      ? "todos"
      : (reasons.find((item) => item.code === query.reason_code)?.label ?? query.reason_code);

  return `periodo ${periodLabel ?? "vigente"}; cajero: ${cashier}; motivo: ${reason}`;
}
