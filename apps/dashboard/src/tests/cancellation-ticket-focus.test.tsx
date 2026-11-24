import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CancellationTrafficLightTable } from "../components/CancellationTrafficLightTable";
import {
  cancellationReportReducer,
  initialCancellationReportState,
  type CancellationReportState,
} from "../viewmodels/cancellation-report";
import {
  describeExportFilters,
  formatDaysToReview,
  FOLIO_SCAN_ROW_LIMIT,
  isFolioOnPage,
  nextFolioScanStep,
  signalLabel,
  ticketFocusBannerText,
  ticketFocusQuery,
  ticketRowAnchorId,
} from "../viewmodels/cancellation-ticket-focus";
import { initialReviewHistoryState } from "../viewmodels/cancellation-review";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, renderReport, reportActions } from "./cancellation-report-helpers";
import { CancellationReportView } from "../views/CancellationReportView";
import { cashierDays, legendItems, renderTraffic } from "./cancellation-review-fixtures";

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const target = { cashierId: 7, cashierName: "Laura Cruz", date: "2026-11-18" };
const dayKey = "7:2026-11-18";

function expanded(onFocusFolio?: (folio: string) => void) {
  return renderToStaticMarkup(
    <CancellationTrafficLightTable
      rows={cashierDays()}
      timezone="America/Mexico_City"
      canReview
      history={initialReviewHistoryState}
      onReview={() => undefined}
      onToggleHistory={() => undefined}
      onViewTickets={() => undefined}
      onFocusFolio={onFocusFolio}
      defaultExpandedKey={dayKey}
    />,
  );
}

/** Reporte con boletos que participan en señales, en el estado de la vista. */
function withFocus(): CancellationReportState {
  const base = readyReportState();

  return cancellationReportReducer(
    { ...base, query: { period: "week", reason_code: "capture_error", date: "2026-11-20" } },
    { type: "ticket-focus-applied", target },
  );
}

describe("CA-29 cancellation-review-signals", () => {
  it("test_ca29_ver_boletos_filters_by_day_and_cashier_with_custom_period", () => {
    expect(ticketFocusQuery(target)).toEqual({
      period: "custom",
      from: "2026-11-18",
      to: "2026-11-18",
      cashier_id: 7,
    });

    const state = withFocus();

    expect(state.query).toEqual(ticketFocusQuery(target));
    // Recarga la API (la consulta cambia) y pasa a «cargando» de inmediato.
    expect(state.status).toBe("loading");

    const html = renderTraffic();

    expect(html).toContain("Ver boletos");
    expect(html).toContain('aria-label="Ver boletos de Laura Cruz del');
    // El grupo sin cajero no tiene «Ver boletos».
    expect(html.match(/Ver boletos de /g)?.length).toBe(3);
  });

  it("cambiar de página conserva el filtro; cambiar otro filtro lo descarta", () => {
    const state = withFocus();
    const paged = cancellationReportReducer(state, {
      type: "query-changed",
      query: { ...state.query, page: 2 },
    });

    expect(paged.ticketFocus).not.toBeNull();
    expect(
      cancellationReportReducer(state, { type: "query-changed", query: { period: "month" } }).ticketFocus,
    ).toBeNull();
  });
});

describe("CA-30 cancellation-review-signals", () => {
  it("test_ca30_quitar_filtro_restores_previous_filters_and_banner_text", () => {
    const state = withFocus();

    expect(state.ticketFocus?.previousQuery).toEqual({
      period: "week",
      reason_code: "capture_error",
      date: "2026-11-20",
    });

    const cleared = cancellationReportReducer(state, { type: "ticket-focus-cleared" });

    expect(cleared.query).toEqual({ period: "week", reason_code: "capture_error", date: "2026-11-20" });
    expect(cleared.ticketFocus).toBeNull();

    // Aplicar otro día sin quitar el filtro conserva los filtros originales.
    const again = cancellationReportReducer(state, {
      type: "ticket-focus-applied",
      target: { ...target, date: "2026-11-19" },
    });

    expect(again.ticketFocus?.previousQuery.date).toBe("2026-11-20");

    const html = renderReport({ ...readyReportState(), ticketFocus: state.ticketFocus, status: "ready" });

    expect(html).toContain(`${ticketFocusBannerText(target)}`);
    expect(html).toContain("Mostrando boletos de Laura Cruz del");
    expect(html).toContain("Quitar filtro");
    expect(renderReport(readyReportState())).not.toContain("Quitar filtro");
  });
});

describe("CA-31 cancellation-review-signals", () => {
  it("test_ca31_highlight_is_not_color_only_and_focus_moves_to_table", () => {
    const html = renderReport({ ...readyReportState(), ticketFocus: withFocus().ticketFocus, status: "ready" });

    // Solo el boleto con signal_codes se resalta, con texto e icono además del estilo.
    expect(html).toContain("cancellation-ticket-row--highlight");
    expect(html.match(/Con señales/g)?.length).toBe(1);
    expect(html).toMatch(/cancellation-ticket-mark"><svg[^>]*aria-hidden="true"/);
    expect(renderReport(readyReportState())).not.toContain("cancellation-ticket-row--highlight");
    // Destino del foco: el encabezado de la tabla, enfocable por código.
    expect(html).toContain('id="cancellation-tickets-heading" tabindex="-1"');
    expect(html).toContain('role="status"');

    const view = read("../views/CancellationReportView.tsx");

    expect(view).toContain("scrollIntoView");
    expect(view).toContain("focus({ preventScroll: true })");
    expect(read("../styles.css")).toMatch(/\.cancellation-ticket-row--highlight > td:first-child \{\s*border-left: 0\.375rem/);
  });
});

describe("CA-32 cancellation-review-signals", () => {
  it("test_ca32_detail_lists_signal_label_count_and_folio_chips_from_api", () => {
    const html = expanded();

    expect(html).toContain("Porcentaje de cancelación alto");
    expect(html).toContain("4 boletos");
    expect(html).toContain("1 boleto<");
    for (const folio of ["101", "102", "103", "104"]) {
      expect(html).toContain(`aria-label="Ir al folio ${folio}"`);
    }
    // La frase clara de la API se muestra tal cual, sin recomponerla.
    expect(html).toContain("3 señales: 16 % cancelado frente a 3 % habitual.");
    expect(read("../components/CancellationTrafficLightTable.tsx")).not.toMatch(/Se activ(ó|aron)/);
    expect(read("../viewmodels/cancellation-ticket-focus.ts")).not.toMatch(/Se activ(ó|aron)/);
  });
});

describe("CA-33 cancellation-review-signals", () => {
  it("test_ca33_folio_chip_goes_to_its_row_or_applies_day_and_cashier_filter", () => {
    const onFocusFolio = vi.fn();
    expect(expanded(onFocusFolio)).not.toContain("disabled");
    expect(read("../components/CancellationTrafficLightTable.tsx")).toContain("onFocusFolio?.(folio");

    const report = cancellationReport();

    expect(isFolioOnPage(report.rows, "101")).toBe(true);
    expect(isFolioOnPage(report.rows, "104")).toBe(false);
    expect(ticketRowAnchorId(101)).toBe("cancellation-ticket-101");
    expect(renderReport(readyReportState())).toContain('id="cancellation-ticket-101"');

    // Fuera de la página: la vista aplica el filtro del día y cajero y luego desplaza.
    const view = read("../views/CancellationReportView.tsx");

    expect(view).toMatch(/setFolioSearch\(\{ folio, visited: \[\] \}\);\s+actions\.viewTickets\(target\)/);
    expect(view).toContain("nextFolioScanStep(");
  });

  it("test_ca33_folio_scan_finds_the_page_of_a_folio_with_a_reasonable_cap", () => {
    const rows = cancellationReport().rows;
    const meta = { current_page: 1, last_page: 4, per_page: 25 };

    // En la página: nada que buscar.
    expect(nextFolioScanStep({ rows, meta, folio: "101", visited: [] })).toEqual({ status: "found" });
    // Fuera: recorre en el orden de la API, sin repetir las páginas vistas.
    expect(nextFolioScanStep({ rows, meta, folio: "999", visited: [] })).toEqual({ status: "scan", page: 2 });
    expect(nextFolioScanStep({ rows, meta: { ...meta, current_page: 2 }, folio: "999", visited: [1] })).toEqual({ status: "scan", page: 3 });
    expect(nextFolioScanStep({ rows, meta: { ...meta, current_page: 4 }, folio: "999", visited: [1, 2, 3] })).toEqual({ status: "not-found" });
    // Tope por filas (per_page): con 100 por página solo se recorren 5 páginas de 500 filas.
    const wide = { current_page: 5, last_page: 50, per_page: 100 };

    expect(nextFolioScanStep({ rows, meta: wide, folio: "999", visited: [1, 2, 3, 4] })).toEqual({ status: "not-found" });
    expect(FOLIO_SCAN_ROW_LIMIT).toBe(500);
    // Sin meta no hay a dónde ir.
    expect(nextFolioScanStep({ rows, meta: undefined, folio: "999", visited: [] })).toEqual({ status: "not-found" });
  });
});

describe("CA-34 cancellation-review-signals", () => {
  it("test_ca34_new_code_uses_rem_tokens_and_no_fetch", () => {
    const styles = read("../styles.css");
    const block = styles.slice(
      styles.indexOf("/* cancellation-ticket-focus"),
      styles.indexOf("/* cancellation-ticket-focus:end"),
    );

    expect(block.length).toBeGreaterThan(300);
    expect(block).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(block).not.toMatch(/(?<![-\w])(?:width|min-width|max-width|height|min-height|font-size|padding|margin|gap)\s*:\s*[\d. ]*\d+px/);

    for (const file of ["../viewmodels/cancellation-ticket-focus.ts", "../components/CancellationTrafficLightTable.tsx"]) {
      expect(read(file), file).not.toMatch(/\bfetch\s*\(|\baxios\b|@arca\/api-client/);
    }
  });
});

describe("CA-32 ticket-cancellation-report", () => {
  it("test_ca32_tickets_table_shows_tardia_and_signals_columns", () => {
    const html = renderReport(readyReportState());

    expect(html).toContain(">Tardía<");
    expect(html).toContain(">Señales<");
    expect(html).toContain(">Sí<");
    expect(html).toContain(">No<");
    // Etiqueta corta de la leyenda de la API; sin leyenda, el código.
    expect(signalLabel("over_limit_percent", legendItems)).toBe("Porcentaje de cancelación alto");
    expect(signalLabel("x_code", legendItems)).toBe("x_code");
    expect(html).toContain("late_cancellations");
  });
});

describe("CA-33 ticket-cancellation-report", () => {
  it("test_ca33_reconciliation_by_cashier_shows_days_to_review", () => {
    const html = renderReport(readyReportState());

    expect(html).toContain(">Días por revisar<");
    expect(html).toContain("2 en Atención · 3 en Revisar");
    expect(formatDaysToReview({ attention: 0, review: 1 })).toBe("1 en Revisar");
    expect(formatDaysToReview({ attention: 0, review: 0 })).toBe("Ninguno");
  });
});

describe("CA-34 ticket-cancellation-report", () => {
  it("test_ca34_export_note_lists_applied_filters", () => {
    const html = renderReport(
      readyReportState({ query: { period: "custom", from: "2026-11-18", to: "2026-11-18", cashier_id: 4 } }),
    );

    expect(html).toContain("Se exportará con los filtros aplicados: periodo 16 nov – 22 nov 2026; cajero: Caja Uno; motivo: todos.");
    expect(
      describeExportFilters({ period: "week", reason_code: "other" }, undefined, [], [{ code: "other", label: "Otro" }]),
    ).toBe("periodo vigente; cajero: todos; motivo: Otro");
  });
});

describe("CA-35 ticket-cancellation-report", () => {
  it("test_ca35_old_alerts_are_removed_everywhere", () => {
    for (const file of [
      "../views/CancellationReportView.tsx",
      "../components/CancellationTrafficLightTable.tsx",
      "../viewmodels/admin-types.ts",
      "../../../../packages/api-client/admin-types.ts",
    ]) {
      expect(read(file), file).not.toMatch(/alert_reasons|CancellationAlertBadge|CancellationAlertDto/);
    }
    const rowType = read("../../../../packages/api-client/admin-types.ts");

    expect(rowType).toContain("late_cancellation: boolean");
    expect(rowType).toContain("signal_codes: string[]");
    expect(rowType).toContain("days_to_review: CancellationDaysToReviewDto");
    expect(rowType).toContain("folios: string[]");
    expect(renderReport(readyReportState())).not.toContain("cancellation-alert");
    expect(initialCancellationReportState.ticketFocus).toBeNull();
    expect(reportActions.viewTickets).toBeDefined();
    void CancellationReportView;
  });
});
