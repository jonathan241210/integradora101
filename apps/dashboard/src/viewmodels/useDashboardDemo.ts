import { useEffect, useReducer } from "react";
import {
  dashboardDemoReducer,
  initialDashboardDemoState,
  type DemoProfile,
  type DashboardSection,
} from "./dashboard-demo";

export function useDashboardDemo() {
  const [state, dispatch] = useReducer(
    dashboardDemoReducer,
    initialDashboardDemoState,
  );

  useEffect(() => {
    if (state.saleStep !== "processing") return undefined;
    const timeout = window.setTimeout(() => dispatch({ type: "finish-sale" }), 1100);
    return () => window.clearTimeout(timeout);
  }, [state.saleStep]);

  return {
    state,
    selectProfile: (profile: DemoProfile) =>
      dispatch({ type: "select-profile", profile }),
    loginAdministration: (username: string, password: string) =>
      dispatch({ type: "login-administration", username, password }),
    loginTicket: (username: string, password: string) =>
      dispatch({ type: "login-ticket", username, password }),
    signOut: () => dispatch({ type: "sign-out" }),
    navigate: (section: DashboardSection) =>
      dispatch({ type: "navigate", section }),
    toggleMenu: () => dispatch({ type: "toggle-menu" }),
    showNotice: (message: string) =>
      dispatch({ type: "show-notice", message }),
    updateEnclosure: (
      id: string,
      name: string,
      description: string,
      status: "Abierto" | "Cerrado",
    ) => dispatch({ type: "update-enclosure", id, name, description, status }),
    addTicketUser: (name: string, username: string, password: string) =>
      dispatch({ type: "add-ticket-user", name, username, password }),
    openSale: () => dispatch({ type: "open-sale" }),
    cancelSale: () => dispatch({ type: "cancel-sale" }),
    beginSale: () => dispatch({ type: "begin-sale" }),
    resetSale: () => dispatch({ type: "reset-sale" }),
  };
}
