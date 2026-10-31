import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { TicketReportView } from "../views/TicketReportView";
import {
  customRange,
  exportTicketReport,
  initialTicketReportState,
  loadTicketReport,
  referenceDateChange,
  selectPeriod,
  ticketReportReducer,
  type TicketReportState,
  type TicketReportViewModel,
} from "../viewmodels/ticket-report";
import { apiError, createAdminApiMock, createHarness, ticketReport } from "./admin-fixtures";

const actions: TicketReportViewModel["actions"] = {
  selectPeriod: vi.fn(),
  applyCustomRange: vi.fn(),
  goToReferenceDate: vi.fn(),
  goToPage: vi.fn(),
  reload: vi.fn(),
  exportAs: vi.fn(),
};

function readyState(overrides: Partial<TicketReportState> = {}): TicketReportState {
  return { ...initialTicketReportState, status: "ready", report: ticketReport(), ...overrides };
}

function render(state: TicketReportState) {
  return renderToStaticMarkup(<TicketReportView state={state} actions={actions} />);
}

describe("CA-11 administration-sections", () => {
  it("ofrece Semanal/Mensual, rango personalizado secundario y navegación anterior/siguiente", () => {
    const markup = render(readyState());

    expect(markup).toContain("Semanal");
    expect(markup).toContain("Mensual");
    expect(markup).toContain("Rango personalizado");
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Semanal/);
    expect(markup).toContain("26 oct – 1 nov 2026");
    // previous_date existe: habilitado; next_date es null: deshabilitado.
    expect(markup).toMatch(/<button(?![^>]*disabled)[^>]*>Periodo anterior<\/button>/);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Periodo siguiente<\/button>/);
  });

  it("muestra los totales, el desglose diario y el listado recibidos de la API", () => {
    const markup = render(readyState());

    expect(markup).toContain("Totales del periodo");
    expect(markup).toContain("$450.00");
    expect(markup).toContain("Desglose diario");
    expect(markup).toContain("$200.00");
    expect(markup).toContain("$250.00");
    expect(markup).toContain("Boletos del periodo");
    expect(markup).toContain("F-0001");
    expect(markup).toContain("$150.00");
    expect(markup).toContain("Página 1 de 2");
    expect(markup).not.toContain("Prototipo de demostración");
  });

  it("carga por periodo y navega reenviando previous_date/next_date sin calcular fechas", async () => {
    const api = createAdminApiMock();
    const h = createHarness(ticketReportReducer, initialTicketReportState);

    await loadTicketReport(api, h.dispatch, h.state.query);
    expect(api.reports.tickets).toHaveBeenCalledWith({ period: "week", page: 1 });
    expect(h.state.status).toBe("ready");

    const previous = h.state.report?.period.previous_date ?? "";
    h.dispatch({ type: "query-changed", changes: referenceDateChange(h.state.query, previous) });
    expect(h.state.query).toMatchObject({ period: "week", date: "2026-10-19", page: 1 });

    h.dispatch({ type: "query-changed", changes: selectPeriod("month") });
    expect(h.state.query).toMatchObject({ period: "month", page: 1 });
    expect(h.state.query.date).toBeUndefined();

    h.dispatch({ type: "query-changed", changes: customRange("2026-10-01", "2026-10-15") });
    expect(h.state.query).toMatchObject({ period: "custom", from: "2026-10-01", to: "2026-10-15" });

    await loadTicketReport(api, h.dispatch, h.state.query);
    expect(api.reports.tickets).toHaveBeenLastCalledWith(h.state.query);
  });

  it("muestra los estados de carga y de error con reintento", async () => {
    const api = createAdminApiMock();
    api.reports.tickets.mockRejectedValueOnce(apiError(422, "El rango no puede superar 366 días."));
    const h = createHarness(ticketReportReducer, initialTicketReportState);

    expect(render(h.state)).toContain("Cargando el reporte…");

    await loadTicketReport(api, h.dispatch, { period: "custom", from: "2025-01-01", to: "2026-12-31" });
    const markup = render(h.state);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("El rango no puede superar 366 días.");
    expect(markup).toContain("Reintentar");
  });
});

describe("CA-12 administration-sections", () => {
  it("ofrece los tres botones de exportación", () => {
    const markup = render(readyState());

    expect(markup).toContain("Exportar CSV");
    expect(markup).toContain("Exportar Excel");
    expect(markup).toContain("Exportar PDF");
  });

  it("solicita el archivo a la API para el periodo visible y lo descarga", async () => {
    const api = createAdminApiMock();
    const save = vi.fn();
    const query = { period: "month" as const, date: "2026-09-15", page: 3 };
    const h = createHarness(ticketReportReducer, readyState({ query }));

    const ok = await exportTicketReport(api, h.dispatch, h.state.query, "csv", save);

    expect(ok).toBe(true);
    expect(api.reports.exportTickets).toHaveBeenCalledWith(query, "csv");
    expect(save).toHaveBeenCalledWith({
      blob: expect.any(Blob),
      filename: "reporte-boletos.csv",
    });
    expect(h.state.exporting).toBeNull();
    expect(h.state.exportError).toBe("");
  });

  it("exporta con la zona del reporte visible y respeta un timezone explícito", async () => {
    const api = createAdminApiMock();
    const report = ticketReport({
      period: { ...ticketReport().period, timezone: "America/Tijuana" },
    });
    const h = createHarness(ticketReportReducer, readyState({ report }));

    await exportTicketReport(api, h.dispatch, h.state.query, "csv", vi.fn(), report);
    expect(api.reports.exportTickets).toHaveBeenLastCalledWith(
      { ...h.state.query, timezone: "America/Tijuana" },
      "csv",
    );

    await exportTicketReport(
      api,
      h.dispatch,
      { ...h.state.query, timezone: "Europe/Madrid" },
      "csv",
      vi.fn(),
      report,
    );
    expect(api.reports.exportTickets).toHaveBeenLastCalledWith(
      { ...h.state.query, timezone: "Europe/Madrid" },
      "csv",
    );

    await exportTicketReport(api, h.dispatch, h.state.query, "csv", vi.fn(), null);
    expect(api.reports.exportTickets).toHaveBeenLastCalledWith(h.state.query, "csv");
  });

  it("muestra el error de formato no disponible y conserva el reporte", async () => {
    const api = createAdminApiMock();
    api.reports.exportTickets.mockRejectedValueOnce(
      apiError(422, "Formato de exportación no disponible."),
    );
    const save = vi.fn();
    const h = createHarness(ticketReportReducer, readyState());
    const reportBefore = h.state.report;

    const ok = await exportTicketReport(api, h.dispatch, h.state.query, "pdf", save);
    const markup = render(h.state);

    expect(ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(h.state.report).toBe(reportBefore);
    expect(h.state.status).toBe("ready");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Formato de exportación no disponible.");
    expect(markup).toContain("F-0001");
  });

  it("muestra un mensaje en español ante un fallo de red y conserva el reporte", async () => {
    const api = createAdminApiMock();
    api.reports.exportTickets.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const h = createHarness(ticketReportReducer, readyState());

    await exportTicketReport(api, h.dispatch, h.state.query, "xlsx", vi.fn());

    expect(h.state.exportError).toContain("No fue posible conectar con el servidor");
    expect(h.state.report).not.toBeNull();
    expect(render(h.state)).toContain("F-0001");
  });
});

describe("CA-13 administration-sections", () => {
  it("muestra al executive el reporte real con exportación y sin acciones de edición", () => {
    const markup = render(readyState());

    expect(markup).toContain("Exportar CSV");
    expect(markup).toContain("F-0001");
    for (const edit of ["Editar", "Eliminar", "Crear", "Desactivar", "Restablecer"]) {
      expect(markup).not.toContain(edit);
    }
  });
});
