import type { ReportTabId } from "./report-tabs";

/**
 * Estado de la shell del dashboard: sección activa, menú móvil y aviso.
 * No contiene datos de demostración (dashboard-005 CA-02); las secciones
 * disponibles las determina `navigation.ts` a partir de los permisos.
 */
export type DashboardSection =
  | "dashboard"
  | "news"
  | "events"
  | "tickets"
  | "ticket-history"
  | "ticket-prices"
  | "reports"
  | "enclosures"
  | "users"
  | "memories"
  | "tulanpedia";

export type DashboardShellState = {
  activeSection: DashboardSection;
  mobileMenuOpen: boolean;
  desktopMenuCollapsed: boolean;
  notice: string;
  /** Pestaña elegida en «Reportes»; `null` usa la primera permitida (dashboard-020 CA-04, CA-05). */
  reportsTab: ReportTabId | null;
};

export type DashboardShellAction =
  | { type: "reset" }
  | { type: "navigate"; section: DashboardSection; available: DashboardSection[] }
  | { type: "select-reports-tab"; tab: ReportTabId; available: ReportTabId[] }
  | { type: "toggle-menu" }
  | { type: "close-menu" }
  | { type: "toggle-desktop-menu" }
  | { type: "show-notice"; message: string };

export const initialDashboardShellState: DashboardShellState = {
  activeSection: "dashboard",
  mobileMenuOpen: false,
  desktopMenuCollapsed: true,
  notice: "",
  reportsTab: null,
};

export function dashboardShellReducer(
  state: DashboardShellState,
  action: DashboardShellAction,
): DashboardShellState {
  switch (action.type) {
    case "reset":
      return initialDashboardShellState;
    case "navigate":
      // Solo se navega a secciones de la lista recibida (sin React Router).
      if (!action.available.includes(action.section)) return state;
      return {
        ...state,
        activeSection: action.section,
        mobileMenuOpen: false,
        notice: "",
        // Al salir de «Reportes» y volver se abre la pestaña por defecto (CA-05, D-6).
        reportsTab: null,
      };
    case "select-reports-tab":
      // Una pestaña no permitida se ignora (CA-06); no hay URL (RN-12).
      if (!action.available.includes(action.tab)) return state;
      return { ...state, reportsTab: action.tab };
    case "toggle-menu":
      return { ...state, mobileMenuOpen: !state.mobileMenuOpen };
    case "close-menu":
      return { ...state, mobileMenuOpen: false };
    case "toggle-desktop-menu":
      return { ...state, desktopMenuCollapsed: !state.desktopMenuCollapsed };
    case "show-notice":
      return { ...state, notice: action.message };
    default:
      return state;
  }
}
