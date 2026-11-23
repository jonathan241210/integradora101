import { describe, expect, it, vi } from "vitest";
import { createHttpClient, createAdminApi } from "@arca/api-client";
import {
  cancellationReportReducer,
  initialCancellationReportState,
  loadCancellationReport,
} from "../viewmodels/cancellation-report";
import { apiError, createAdminApiMock, createHarness } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";

describe("CA-02 ticket-cancellation-report", () => {
  it("test_ca02_403_shows_api_message_without_rows_or_totals_and_without_retry", async () => {
    const message = "No tienes permiso para consultar las cancelaciones.";
    const api = createAdminApiMock();
    api.reports.cancellations.mockRejectedValue(apiError(403, message));
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    await loadCancellationReport(api, h.dispatch, { period: "week" });

    expect(h.state.status).toBe("forbidden");
    expect(api.reports.cancellations).toHaveBeenCalledOnce();

    const markup = renderReport(h.state);

    expect(markup).toContain(message);
    expect(markup).not.toContain("Reintentar");
    expect(markup).not.toContain("Totales del periodo");
    expect(markup).not.toContain("Boletos cancelados</h2>");
    expect(markup).not.toContain("101");
  });

  it("un 403 posterior descarta el reporte que hubiera en pantalla", () => {
    const next = cancellationReportReducer(readyReportState(), {
      type: "load-failed",
      message: "Sin permiso",
      forbidden: true,
      fieldErrors: {},
    });

    expect(next.report).toBeNull();
  });
});

describe("CA-03 ticket-cancellation-report", () => {
  it("test_ca03_401_goes_to_global_session_handler_and_page_shows_no_error", async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ message: "Unauthenticated." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    const http = createHttpClient({ baseUrl: "", fetchImpl, onUnauthorized });
    const h = createHarness(cancellationReportReducer, initialCancellationReportState);

    await loadCancellationReport(createAdminApi(http), h.dispatch, { period: "week" });

    // El 401 lo atiende el manejador global (dashboard-002 CA-08: «Tu sesión expiró»).
    expect(onUnauthorized).toHaveBeenCalled();
    expect(h.actions.map((action) => action.type)).toEqual(["load-started"]);
  });
});
