import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReportExportButtons } from "../components/ReportExportButtons";
import { ReportPeriodControls } from "../components/ReportPeriodControls";
import { ReportTotals } from "../components/ReportTotals";
import { ReportViewState } from "../components/ReportViewState";
import { TicketHistoryView } from "../views/TicketHistoryView";
import { TicketReportView } from "../views/TicketReportView";
import { defaultReportPeriod, reportPeriodOptions } from "../viewmodels/report-period";
import { exportButtonLabel, reportExportOptions } from "../viewmodels/report-export";
import { initialCancellationReportState } from "../viewmodels/cancellation-report";
import { initialTicketReportState } from "../viewmodels/ticket-report";
import {
  initialTicketHistoryState,
  ticketHistoryReducer,
  type TicketHistoryViewModel,
} from "../viewmodels/ticket-history";
import { historyRow } from "./ticket-sales-fixtures";
import { ticketReport } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const noop = () => undefined;

const historyActions: TicketHistoryViewModel["actions"] = {
  applyFilters: noop,
  goToPage: noop,
  reload: noop,
  openCancel: noop,
  closeCancel: noop,
  changeReasonCode: noop,
  changeReason: noop,
  confirmCancel: noop,
  dismissNotice: noop,
};
const historyState = ticketHistoryReducer(initialTicketHistoryState, {
  type: "loaded",
  rows: [historyRow({ folio: 7, cancellable: true })],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
});
const reasons = { reasons: [], status: "ready", error: "" } as unknown as TicketHistoryViewModel["reasons"];

const ticketActions = {
  selectPeriod: vi.fn(),
  applyCustomRange: vi.fn(),
  goToReferenceDate: vi.fn(),
  goToPage: vi.fn(),
  reload: vi.fn(),
  exportAs: vi.fn(),
};
const renderTickets = (overrides = {}) =>
  renderToStaticMarkup(
    <TicketReportView
      state={{ ...initialTicketReportState, status: "ready", report: ticketReport(), ...overrides }}
      actions={ticketActions}
    />,
  );

describe("CA-08 unified-reports-and-feedback", () => {
  it("no muestra cancelar en el historial de Reportes aunque la API marque cancellable", () => {
    const rendered = (canCancel: boolean) =>
      renderToStaticMarkup(
        <TicketHistoryView
          state={historyState}
          actions={historyActions}
          reasons={reasons}
          canCancel={canCancel}
          heading={false}
        />,
      );

    expect(historyState.rows[0].cancellable).toBe(true);
    expect(rendered(false)).not.toContain("Cancelar boleto 7");
    expect(rendered(false)).not.toContain(">Acciones<");
    expect(rendered(true)).toContain("Cancelar boleto 7");
    expect(source("sections/ReportsSection.tsx")).toContain("canCancel={canCancel}");
    expect(source("App.tsx")).toContain("canCancelInReports(profile.permissions)");
  });
});

describe("CA-13 unified-reports-and-feedback", () => {
  it("usa el mismo grupo de exportación con tres formatos en orden", () => {
    expect(reportExportOptions.map((option) => option.label)).toEqual([
      "Exportar CSV",
      "Exportar Excel",
      "Exportar PDF",
    ]);

    for (const markup of [renderTickets(), renderReport(readyReportState())]) {
      expect(markup.indexOf(">Exportar CSV<")).toBeGreaterThan(-1);
      expect(markup.indexOf(">Exportar CSV<")).toBeLessThan(markup.indexOf(">Exportar Excel<"));
      expect(markup.indexOf(">Exportar Excel<")).toBeLessThan(markup.indexOf(">Exportar PDF<"));
    }
    expect(source("views/TicketReportView.tsx")).toContain("<ReportExportButtons");
    expect(source("views/CancellationReportView.tsx")).toContain("<ReportExportButtons");
  });
});

describe("CA-14 unified-reports-and-feedback", () => {
  it("deshabilita la exportación en curso y ubica los errores", () => {
    const busy = renderToStaticMarkup(<ReportExportButtons exporting="xlsx" onExport={noop} />);

    expect(busy.match(/disabled=""/g)).toHaveLength(3);
    expect(busy).toContain(">Descargando…<");
    expect(exportButtonLabel(reportExportOptions[0], "xlsx")).toBe("Exportar CSV");

    // 422 de formato o tope: junto al grupo.
    const message = "El PDF admite hasta 2000 boletos.";
    const invalid = renderToStaticMarkup(
      <ReportExportButtons exporting={null} fieldErrors={{ format: [message] }} onExport={noop} />,
    );

    expect(invalid).toContain(message);
    expect(invalid).toContain('id="report-export-error"');

    // Red o 5xx: aviso emergente (ActionError), no texto propio del grupo.
    expect(source("views/TicketReportView.tsx")).toContain("<ActionError message={state.exportError}");
    expect(source("views/CancellationReportView.tsx")).toContain("<ActionError message={state.exportError}");
  });
});

describe("CA-15 unified-reports-and-feedback", () => {
  it("usa el mismo selector de periodo con Semanal por defecto", () => {
    expect(reportPeriodOptions.map((option) => option.label)).toEqual(["Semanal", "Mensual", "Rango personalizado"]);
    expect(defaultReportPeriod).toBe("week");
    expect(initialTicketReportState.query.period).toBe("week");
    expect(initialCancellationReportState.query.period).toBe("week");

    for (const markup of [renderTickets(), renderReport(readyReportState())]) {
      expect(markup).toMatch(/aria-pressed="true"[^>]*>Semanal</);
      expect(markup).toContain(">Mensual<");
      expect(markup).toContain(">Rango personalizado<");
      expect(markup).toContain("Periodo anterior");
      expect(markup).toContain("Periodo siguiente");
    }

    const custom = renderToStaticMarkup(
      <ReportPeriodControls
        period="custom"
        errors={{ from: ["Fecha inválida."], period: ["Periodo inválido."] }}
        onSelectPeriod={noop}
        onApplyRange={noop}
        onGoToDate={noop}
      />,
    );

    expect(custom).toContain("Fecha desde");
    expect(custom).toContain("Fecha hasta");
    expect(custom).toContain("Aplicar rango");
    expect(custom).toContain("Fecha inválida.");
    expect(custom).toContain('id="report-period-error"');
    expect(source("views/TicketReportView.tsx")).toContain("<ReportPeriodControls");
    expect(source("views/CancellationReportView.tsx")).toContain("<ReportPeriodControls");
  });
});

describe("CA-16 unified-reports-and-feedback", () => {
  it("usa el mismo componente de totales y estilo de tabla, con valores de la API", () => {
    const markup = renderToStaticMarkup(
      <ReportTotals headingId="t" heading="Totales" metrics={[{ key: "a", label: "Boletos", value: "7" }]} />,
    );

    expect(markup).toContain("report-metric");
    expect(markup).toContain("<strong>7</strong>");
    for (const file of ["views/TicketReportView.tsx", "views/CancellationReportView.tsx"]) {
      const text = source(file);

      expect(text).toContain("<ReportTotals");
      expect(text).toContain("<DataTable");
      expect(text).toMatch(/caption="/);
      expect(text).not.toMatch(/\.reduce\(/);
    }
  });
});

describe("CA-17 unified-reports-and-feedback", () => {
  it("muestra carga, vacío y error con reintento en ambas pestañas", () => {
    const loading = renderToStaticMarkup(<ReportViewState status="loading" error="" onRetry={noop} />);
    const empty = renderToStaticMarkup(<ReportViewState status="empty" error="" emptyText="Sin datos." onRetry={noop} />);
    const failed = renderToStaticMarkup(<ReportViewState status="error" error="Falló." onRetry={noop} />);

    expect(loading).toContain("Cargando el reporte…");
    expect(empty).toContain("Sin datos.");
    expect(failed).toContain("Falló.");
    expect(failed).toContain("Reintentar");
    expect(renderTickets({ status: "error", error: "No se pudo cargar." })).toContain("Reintentar");
    expect(renderReport(readyReportState({ status: "error", error: "No se pudo cargar." }))).toContain("Reintentar");
    expect(source("views/TicketReportView.tsx")).toContain("<ReportViewState");
    expect(source("views/CancellationReportView.tsx")).toContain("<ReportViewState");
  });
});
