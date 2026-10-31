import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DashboardView } from "../views/DashboardView";
import {
  dashboardSummaryReducer,
  initialDashboardSummaryState,
  loadDashboardSummary,
  toRevenueBars,
} from "../viewmodels/dashboard-summary";
import { apiError, createAdminApiMock, createHarness, emptySummary, summary } from "./admin-fixtures";

const noActions = { reload: vi.fn() };

describe("CA-10 administration-sections", () => {
  it("muestra los totales de hoy y de 7 días y la serie tal como los entrega la API", async () => {
    const api = createAdminApiMock();
    const h = createHarness(dashboardSummaryReducer, initialDashboardSummaryState);

    await loadDashboardSummary(api, h.dispatch);
    const markup = renderToStaticMarkup(
      <DashboardView state={h.state} actions={noActions} onOpenReport={() => undefined} />,
    );

    expect(h.state.status).toBe("ready");
    expect(markup).toContain("Panel principal");
    expect(markup).toContain(">Hoy</h2>");
    expect(markup).toContain("Últimos 7 días");
    for (const label of ["Boletos", "Adultos", "Niños", "Ingresos"]) {
      expect(markup).toContain(`<span>${label}</span>`);
    }
    expect(markup).toContain("12");
    expect(markup).toContain("80");
    expect(markup).toContain("$1,234.50");
    expect(markup).toContain("$9,876.00");
    expect(markup).toContain("Ingresos por día");
    expect(markup).toContain("Ver reporte");
    expect(markup).not.toContain("Muestra");
    expect(markup).not.toContain("Prototipo de demostración");
  });

  it("no calcula totales: la geometría de la gráfica no altera los importes", () => {
    const bars = toRevenueBars(summary.series);

    expect(bars.map((bar) => bar.revenue)).toEqual(["100.00", "200.00", "0.00"]);
    expect(bars.map((bar) => bar.height)).toEqual([50, 100, 0]);
  });

  it("muestra un estado vacío claro cuando no hay ventas", async () => {
    const api = createAdminApiMock({ dashboard: { summary: vi.fn(async () => emptySummary) } });
    const h = createHarness(dashboardSummaryReducer, initialDashboardSummaryState);

    await loadDashboardSummary(api, h.dispatch);
    const markup = renderToStaticMarkup(<DashboardView state={h.state} actions={noActions} />);

    expect(h.state.status).toBe("empty");
    expect(markup).toContain("Aún no hay ventas registradas en los últimos 7 días.");
    expect(markup).not.toContain("Ingresos por día");
  });

  it("presenta los estados de carga y de error con reintento", async () => {
    const api = createAdminApiMock({
      dashboard: { summary: vi.fn(async () => { throw apiError(500, "Error del servidor."); }) },
    });
    const h = createHarness(dashboardSummaryReducer, initialDashboardSummaryState);

    expect(renderToStaticMarkup(<DashboardView state={h.state} actions={noActions} />)).toContain(
      "Cargando el resumen…",
    );

    await loadDashboardSummary(api, h.dispatch);
    const markup = renderToStaticMarkup(<DashboardView state={h.state} actions={noActions} />);

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Error del servidor.");
    expect(markup).toContain("Reintentar");
  });
});
