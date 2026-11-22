import { describe, expect, it } from "vitest";
import {
  buildCancellationQuery,
  cancellationReportReducer,
  emptyCancellationFilters,
  initialCancellationReportState,
  loadCancellationCashiers,
  loadCancellationReport,
  reasonFilterOptions,
} from "../viewmodels/cancellation-report";
import { apiError, cancellationReport, createAdminApiMock, createHarness } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

describe("CA-04 ticket-cancellation-report", () => {
  it("test_ca04_defaults_to_week_with_period_and_filter_controls", () => {
    expect(initialCancellationReportState.query).toEqual({ period: "week" });

    const markup = renderReport(readyReportState());

    // dashboard-020 CA-15 (D-5): selector compartido «Semanal», «Mensual» y «Rango personalizado».
    expect(markup).toContain(">Semanal<");
    expect(markup).toContain(">Mensual<");
    expect(markup).toContain(">Rango personalizado<");
    expect(markup).toMatch(/aria-pressed="true"[^>]*>Semanal</);
    expect(markup).toContain('for="cancellation-cashier"');
    expect(markup).toContain('for="cancellation-reason"');
  });

  it("el rango personalizado pide fecha inicial y final", () => {
    const markup = renderReport(readyReportState({ query: { period: "custom" } }));

    expect(markup).toContain("Fecha desde");
    expect(markup).toContain("Fecha hasta");
  });
});

describe("CA-05 ticket-cancellation-report", () => {
  it("test_ca05_applying_filters_requests_the_api_with_those_values", async () => {
    const api = createAdminApiMock();
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);
    const query = buildCancellationQuery({
      ...emptyCancellationFilters,
      period: "custom",
      from: "2026-11-01",
      to: "2026-11-15",
      cashierId: "4",
      reasonCode: "other",
    });

    h.dispatch({ type: "query-changed", query });
    await loadCancellationReport(api, h.dispatch, h.state.query);

    expect(api.reports.cancellations).toHaveBeenCalledWith({
      period: "custom",
      from: "2026-11-01",
      to: "2026-11-15",
      cashier_id: 4,
      reason_code: "other",
    });
    // La API devolvió el reporte tal cual; la página no filtra ni recalcula.
    expect(h.state.report?.rows).toHaveLength(2);
  });

  it("semana y mes envían la fecha de referencia y no el rango", () => {
    expect(
      buildCancellationQuery({ ...emptyCancellationFilters, period: "month", date: "2026-10-15", from: "x" }),
    ).toEqual({ period: "month", date: "2026-10-15" });
  });

  it("un 422 de periodo se muestra junto al campo", async () => {
    const api = createAdminApiMock();
    const message = "La fecha final no puede ser anterior a la inicial.";
    api.reports.cancellations.mockRejectedValue(apiError(422, message, { to: [message] }));
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    h.dispatch({ type: "query-changed", query: { period: "custom", from: "2026-11-10", to: "2026-11-01" } });
    await loadCancellationReport(api, h.dispatch, h.state.query);

    const markup = renderReport(h.state);

    expect(markup).toContain(message);
    expect(markup).toContain('id="report-to-error"');
    expect(markup).toContain('aria-invalid="true"');
  });
});

describe("CA-06 ticket-cancellation-report", () => {
  it("test_ca06_cashier_filter_comes_from_the_api_not_the_client", async () => {
    const api = createAdminApiMock();
    api.reports.cancellationCashiers.mockResolvedValue([{ id: 99, name: "Cajera Eliminada" }]);
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    await loadCancellationCashiers(api, h.dispatch);

    const markup = renderReport(h.state);

    expect(api.reports.cancellationCashiers).toHaveBeenCalledOnce();
    expect(markup).toContain('<option value="99">Cajera Eliminada</option>');
    expect(markup).not.toContain("Caja Uno</option>");
  });

  it("las opciones de motivo salen del catálogo o, sin él, de los motivos del reporte", () => {
    const report = cancellationReport();

    expect(reasonFilterOptions([], report)).toEqual([
      { code: "capture_error", label: "Error de captura" },
    ]);
    expect(
      reasonFilterOptions([{ code: "other", label: "Otro", comment_policy: "required" }], report),
    ).toEqual([{ code: "other", label: "Otro" }]);
  });

  it("si la lista de cajeros falla, el reporte sigue disponible", async () => {
    const api = createAdminApiMock();
    api.reports.cancellationCashiers.mockRejectedValue(apiError(500, "Error"));
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    await loadCancellationCashiers(api, h.dispatch);

    expect(h.state.cashiers).toEqual([]);
    expect(h.actions).toEqual([]);
  });
});
