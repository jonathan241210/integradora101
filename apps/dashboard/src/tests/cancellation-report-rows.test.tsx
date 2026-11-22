import { describe, expect, it } from "vitest";
import { formatTicketDateTime } from "../viewmodels/ticket-history";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

describe("CA-07 ticket-cancellation-report", () => {
  it("test_ca07_row_columns_and_dates_in_api_timezone", () => {
    const markup = renderReport(readyReportState());

    for (const header of [
      "Folio",
      "Adultos",
      "Niños",
      "Importe",
      "Venta",
      "Cancelación",
      "Vendió",
      "Canceló",
      "Motivo",
      "Comentario",
      "Minutos",
    ]) {
      expect(markup).toContain(`>${header}</th>`);
    }
    // 16:00Z en la zona de negocio, formato dd/mm/aaaa HH:mm.
    expect(formatTicketDateTime("2026-11-17T16:00:00Z", "America/Mexico_City")).toBe("17/11/2026 10:00");
    expect(markup).toContain("17/11/2026 10:00");
    expect(markup).toContain("17/11/2026 10:45");
    expect(markup).toContain("Se cobró doble");
    expect(markup).toContain(">45<");
  });

  it("usa la zona que devuelve la API y no la del navegador", () => {
    const base = cancellationReport();
    const report = cancellationReport({ period: { ...base.period, timezone: "Asia/Tokyo" } });

    // 16:00Z en Tokio son las 01:00 del día siguiente.
    expect(renderReport(readyReportState({ report }))).toContain("18/11/2026 01:00");
  });

  it("sin zona en la respuesta usa el respaldo America/Mexico_City", () => {
    const base = cancellationReport();
    const report = cancellationReport({ period: { ...base.period, timezone: undefined } });

    expect(renderReport(readyReportState({ report }))).toContain("17/11/2026 10:00");
  });
});

describe("CA-08 ticket-cancellation-report", () => {
  it("test_ca08_legacy_row_shows_unclassified_label_and_stored_comment", () => {
    const markup = renderReport(readyReportState());

    expect(markup).toContain("Sin clasificar (anterior)");
    expect(markup).toContain("Texto anterior guardado");
  });
});

describe("CA-09 ticket-cancellation-report", () => {
  it("test_ca09_totals_are_shown_as_the_api_returns_them", () => {
    const base = cancellationReport();
    // Valor deliberadamente distinto de la suma de filas: la página no suma.
    const report = cancellationReport({
      totals: { ...base.totals, cancelled_tickets: 77, cancelled_amount: "1234.50" },
    });
    const markup = renderReport(readyReportState({ report }));

    expect(markup).toContain(">77<");
    expect(markup).toContain("$1,234.50");
    expect(markup).toContain("Caja Uno");
    expect(markup).toContain("$132.00");
    expect(markup).toContain("Error de captura");
  });
});

describe("CA-10 ticket-cancellation-report", () => {
  it("test_ca10_table_has_own_scroll_and_keeps_headers", () => {
    const base = cancellationReport();
    const rows = Array.from({ length: 60 }, (_, index) => ({
      ...base.rows[0],
      folio: 1000 + index,
    }));
    const markup = renderReport(readyReportState({ report: cancellationReport({ rows }) }));

    expect(markup).toContain("table-scroll data-table-scroll");
    expect(markup).toContain("60 registros");
    expect(markup).toContain(">1059<");
  });
});
