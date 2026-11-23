import { describe, expect, it, vi } from "vitest";
import {
  cancellationReportReducer,
  exportCancellationReport,
  initialCancellationReportState,
} from "../viewmodels/cancellation-report";
import { apiError, createAdminApiMock, createHarness } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

const query = { period: "week" as const, date: "2026-11-17", cashier_id: 4, reason_code: "other" as const };

describe("CA-16 ticket-cancellation-report", () => {
  it("test_ca16_export_uses_same_filters_and_api_filename", async () => {
    const api = createAdminApiMock();
    const save = vi.fn();
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    const ok = await exportCancellationReport(api, h.dispatch, query, "xlsx", save);

    expect(ok).toBe(true);
    expect(api.reports.exportCancellations).toHaveBeenCalledWith(query, "xlsx");
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ filename: "cancelaciones-2026-11-16.csv" }));
    expect(h.state.exporting).toBeNull();
  });

  it("el botón se deshabilita mientras genera y ofrece CSV, Excel y PDF", () => {
    const idle = renderReport(readyReportState());
    const busy = renderReport(readyReportState({ exporting: "pdf" }));

    // dashboard-020 CA-13, CA-14: tres botones iguales a los de Boletos (D-7).
    expect(idle).toContain(">Exportar CSV<");
    expect(idle).toContain(">Exportar Excel<");
    expect(idle).toContain(">Exportar PDF<");
    expect(idle).toMatch(/<button(?![^>]*disabled)[^>]*>Exportar CSV<\/button>/);
    expect(busy).toMatch(/<button[^>]*disabled=""[^>]*>Descargando…<\/button>/);
    expect(busy).toMatch(/<button[^>]*disabled=""[^>]*>Exportar CSV<\/button>/);
  });
});

describe("CA-17 ticket-cancellation-report", () => {
  it("test_ca17_422_shows_api_message_next_to_format_selector_and_downloads_nothing", async () => {
    const message = "El PDF admite hasta 2000 boletos. Exporta en CSV o Excel.";
    const api = createAdminApiMock();
    api.reports.exportCancellations.mockRejectedValue(apiError(422, message, { format: [message] }));
    const save = vi.fn();
    const h = createHarness(cancellationReportReducer, readyReportState());

    const ok = await exportCancellationReport(api, h.dispatch, query, "pdf", save);
    const markup = renderReport(h.state);

    expect(ok).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(markup).toContain(message);
    expect(markup).toContain('id="report-export-error"');
    expect(h.state.report).not.toBeNull();
  });

  it("un fallo de red o 5xx muestra error y no reintenta", async () => {
    const api = createAdminApiMock();
    api.reports.exportCancellations.mockRejectedValue(apiError(503, "Servicio no disponible."));
    const h = createHarness(cancellationReportReducer, readyReportState());

    await exportCancellationReport(api, h.dispatch, query, "csv", vi.fn());

    expect(api.reports.exportCancellations).toHaveBeenCalledOnce();
    expect(renderReport(h.state)).toContain("Servicio no disponible.");
  });
});
