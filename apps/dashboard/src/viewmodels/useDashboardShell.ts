import { useReducer } from "react";
import type { ReportTabId } from "./report-tabs";
import {
  dashboardShellReducer,
  initialDashboardShellState,
  type DashboardSection,
} from "./dashboard-shell";

export function useDashboardShell() {
  const [state, dispatch] = useReducer(
    dashboardShellReducer,
    initialDashboardShellState,
  );

  return {
    state,
    reset: () => dispatch({ type: "reset" }),
    navigate: (section: DashboardSection, available: DashboardSection[]) =>
      dispatch({ type: "navigate", section, available }),
    selectReportsTab: (tab: ReportTabId, available: ReportTabId[]) =>
      dispatch({ type: "select-reports-tab", tab, available }),
    toggleMenu: () => dispatch({ type: "toggle-menu" }),
    closeMenu: () => dispatch({ type: "close-menu" }),
    toggleDesktopMenu: () => dispatch({ type: "toggle-desktop-menu" }),
    showNotice: (message: string) => dispatch({ type: "show-notice", message }),
  };
}
