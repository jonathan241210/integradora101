import { useEffect, useReducer } from "react";
import { adminApi } from "@/services/arca-api";
import {
  dashboardSummaryReducer,
  initialDashboardSummaryState,
  loadDashboardSummary,
  type DashboardSummaryViewModel,
} from "./dashboard-summary";

export function useDashboardSummary(): DashboardSummaryViewModel {
  const [state, dispatch] = useReducer(
    dashboardSummaryReducer,
    initialDashboardSummaryState,
  );

  useEffect(() => {
    void loadDashboardSummary(adminApi, dispatch);
  }, []);

  return {
    state,
    actions: { reload: () => void loadDashboardSummary(adminApi, dispatch) },
  };
}
