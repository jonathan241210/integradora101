import { describe, expect, it } from "vitest";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

// Revisión 2026-11-21 (c): el semáforo es la única alerta. Se retiran `alert`,
// `alert_reasons` y `CancellationAlertBadge`; el CA-14 original queda sustituido por
// «Tardía» y «Señales» (CA-32 ticket-cancellation-report).
describe("CA-14 ticket-cancellation-report", () => {
  it("test_ca14_old_alert_badge_is_replaced_by_late_and_signals_columns", () => {
    const markup = renderReport(readyReportState());

    expect(markup).not.toContain("cancellation-alert");
    expect(markup).not.toContain(">Revisar<");
    expect(markup).toContain(">Tardía<");
  });

  it("no cambia el orden ni oculta filas", () => {
    const markup = renderReport(readyReportState());

    expect(markup.indexOf(">101<")).toBeGreaterThan(-1);
    expect(markup.indexOf(">101<")).toBeLessThan(markup.indexOf(">90<"));
    expect(markup).toContain(">90<");
  });
});

describe("CA-15 ticket-cancellation-report", () => {
  it("test_ca15_cashier_signal_shows_api_percent_and_ticket_count", () => {
    const markup = renderReport(readyReportState());

    expect(markup).toContain("12 %");
    expect(markup).toContain(">25<");
  });

  it("muestra el porcentaje tal como llega, sin recalcularlo", async () => {
    const { cancellationReport } = await import("./admin-fixtures");
    const base = cancellationReport();
    const cashier = { ...base.reconciliation.cashiers[0], cancel_percent: "33.3", sold_tickets: 3 };
    const report = cancellationReport({
      reconciliation: { ...base.reconciliation, cashiers: [cashier] },
    });

    expect(renderReport(readyReportState({ report }))).toContain("33.3 %");
  });
});
