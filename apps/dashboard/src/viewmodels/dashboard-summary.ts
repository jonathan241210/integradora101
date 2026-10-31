import type { AdminApi, DashboardSummaryDto } from "./admin-types";
import { describeApiError } from "./api-errors";

export type DashboardSummaryState = {
  status: "loading" | "ready" | "empty" | "error";
  summary: DashboardSummaryDto | null;
  error: string;
};

export type DashboardSummaryAction =
  | { type: "load-started" }
  | { type: "loaded"; summary: DashboardSummaryDto }
  | { type: "load-failed"; message: string };

export type DashboardSummaryDispatch = (action: DashboardSummaryAction) => void;

export const initialDashboardSummaryState: DashboardSummaryState = {
  status: "loading",
  summary: null,
  error: "",
};

export function dashboardSummaryReducer(
  state: DashboardSummaryState,
  action: DashboardSummaryAction,
): DashboardSummaryState {
  switch (action.type) {
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return {
        status:
          action.summary.today.tickets === 0 &&
          action.summary.last_7_days.tickets === 0
            ? "empty"
            : "ready",
        summary: action.summary,
        error: "",
      };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    default:
      return state;
  }
}

/** Los totales y la serie se muestran tal como los calcula la API (RN-04). */
export async function loadDashboardSummary(
  api: AdminApi,
  dispatch: DashboardSummaryDispatch,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    dispatch({ type: "loaded", summary: await api.dashboard.summary() });
  } catch (error) {
    const described = describeApiError(error);

    if (!described.unauthorized) {
      dispatch({ type: "load-failed", message: described.message });
    }
  }
}

export type RevenueBar = {
  date: string;
  /** Importe tal como lo entregó la API. */
  revenue: string;
  /** Altura relativa (0 a 100) solo para dibujar la barra. */
  height: number;
};

/**
 * Geometría de la gráfica: escala cada barra contra la mayor de la serie.
 * Es presentación; los importes y totales no se calculan en el cliente.
 */
export function toRevenueBars(
  series: DashboardSummaryDto["series"],
): RevenueBar[] {
  const highest = Math.max(0, ...series.map((point) => Number(point.revenue) || 0));

  return series.map((point) => ({
    date: point.date,
    revenue: point.revenue,
    height:
      highest > 0 ? Math.round(((Number(point.revenue) || 0) / highest) * 100) : 0,
  }));
}

export type DashboardSummaryViewModel = {
  state: DashboardSummaryState;
  actions: { reload: () => void };
};
