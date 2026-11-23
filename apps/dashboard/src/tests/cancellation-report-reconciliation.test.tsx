import { describe, expect, it } from "vitest";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

describe("CA-11 ticket-cancellation-report", () => {
  it("test_ca11_gross_cancelled_and_net_per_day_and_cashier", () => {
    const markup = renderReport(readyReportState());

    expect(markup).toContain("Conciliación por día");
    expect(markup).toContain("Conciliación por cajero");
    expect(markup).toContain(">Vendido bruto</th>");
    expect(markup).toContain("$500.00");
    expect(markup).toContain("$368.00");
  });
});

describe("CA-12 ticket-cancellation-report", () => {
  it("test_ca12_unbalanced_flag_is_reported_as_data_error_not_as_a_column", () => {
    const markup = renderReport(readyReportState());

    // La columna «cuadra» ya no existe; el aviso reemplaza al texto anterior (CA-29, CA-30).
    expect(markup).not.toContain("No cuadra. Revisa con Informática.");
    expect(markup).toContain("Error de datos en este día");
  });
});

describe("CA-29 ticket-cancellation-report", () => {
  it("test_ca29_reconciliation_tables_have_no_balanced_column", () => {
    const markup = renderReport(readyReportState());

    expect(markup).not.toContain(">Conciliación</th>");
    expect(markup).not.toContain(">Cuadra<");
    expect(markup).not.toContain(">No cuadra<");
    expect(markup).toContain(">Neto</th>");
  });
});

describe("CA-30 ticket-cancellation-report", () => {
  it("test_ca30_balanced_false_shows_error_alert_in_row_and_above_table", () => {
    const base = cancellationReport();
    const report = cancellationReport({
      reconciliation: {
        ...base.reconciliation,
        days: [{ date: "2026-11-17", gross: "10.00", cancelled: "0.00", net: "10.00", balanced: false }],
        cashiers: [{ ...base.reconciliation.cashiers[0], balanced: false }],
      },
    });
    const markup = renderReport(readyReportState({ report }));
    const dayRow =
      "Error de datos en este día: el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";
    const cashierRow =
      "Error de datos para este cajero: el bruto no coincide con neto + cancelado. Repórtalo a sistemas.";

    expect(markup).toContain(dayRow);
    expect(markup).toContain(cashierRow);
    // Además del aviso en la fila hay uno arriba de cada tabla, en tono de error.
    expect(markup.match(/role="alert"[^>]*>Error de datos: /g)?.length).toBe(2);
    expect(markup).toMatch(/arca-alert[^>]*role="alert"[^>]*>Error de datos en este día/);

    const balanced = renderReport(readyReportState({ report: cancellationReport({
      reconciliation: {
        ...base.reconciliation,
        days: base.reconciliation.days.map((day) => ({ ...day, balanced: true })),
        cashiers: base.reconciliation.cashiers.map((cashier) => ({ ...cashier, balanced: true })),
      },
    }) }));

    expect(balanced).not.toContain("Error de datos");
  });
});

describe("CA-31 ticket-cancellation-report", () => {
  it("test_ca31_reconciliation_help_line_explains_net_to_hand_over", () => {
    const help = "Neto a entregar = vendido bruto − cancelado. Compáralo con el dinero que entregó el cajero.";

    expect(renderReport(readyReportState())).toContain(help);
    expect(renderReport(readyReportState({ query: { period: "week", reason_code: "other" } }))).not.toContain(help);
  });
});

describe("CA-13 ticket-cancellation-report", () => {
  it("test_ca13_days_and_cashiers_not_sent_by_the_api_are_not_rows", () => {
    const base = cancellationReport();
    const report = cancellationReport({
      reconciliation: { days: [base.reconciliation.days[0]], cashiers: [] },
    });
    const markup = renderReport(readyReportState({ report }));

    expect(markup).toContain("17 nov 2026");
    expect(markup).not.toContain("18 nov 2026");
    expect(markup).not.toContain("Caja Uno</span>");
    expect(markup).toContain("Sin actividad en el periodo.");
  });
});

describe("CA-11 ticket-cancellation-report (filtro de motivo y cajero nulo)", () => {
  it("test_ca11_with_reason_filter_hides_net_balance_and_percent_and_shows_note", () => {
    const filtered = renderReport(readyReportState({ query: { period: "week", reason_code: "other" } }));
    const plain = renderReport(readyReportState());
    const note =
      "Con filtro de motivo la conciliación no aplica; quita el filtro para ver bruto, cancelado y neto.";

    expect(filtered).toContain(note);
    expect(filtered).toContain(">Vendido bruto</th>");
    expect(filtered).toContain(">Cancelado</th>");
    expect(filtered).not.toContain(">Neto</th>");
    expect(filtered).not.toContain("Error de datos");
    expect(filtered).not.toContain("% cancelación");
    expect(plain).not.toContain(note);
    expect(plain).toContain(">Neto</th>");
  });

  it("acepta cashier_id nulo («Sin cajero registrado») con keys estables", () => {
    const base = cancellationReport();
    const report = cancellationReport({
      totals: {
        ...base.totals,
        by_cashier: [
          { cashier_id: null, cashier_name: "Sin cajero registrado", cancelled_tickets: 1, cancelled_amount: "25.00" },
        ],
      },
      reconciliation: {
        ...base.reconciliation,
        cashiers: [{ ...base.reconciliation.cashiers[0], cashier_id: null, cashier_name: "Sin cajero registrado" }],
      },
    });

    expect(renderReport(readyReportState({ report }))).toContain("Sin cajero registrado");
  });
});
