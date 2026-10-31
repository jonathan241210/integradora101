export type DashboardSection =
  | "dashboard"
  | "news"
  | "events"
  | "tickets"
  | "reports"
  | "enclosures"
  | "users"
  | "ticket-history";

export type DemoProfile = "administration" | "executive" | "ticket";

export type SaleStep = "idle" | "confirmation" | "processing" | "complete";

export type DashboardDemoState = {
  activeProfile: DemoProfile | null;
  activeSection: DashboardSection;
  mobileMenuOpen: boolean;
  saleStep: SaleStep;
  notice: string;
};

export type DashboardDemoAction =
  | { type: "start-session"; profile: DemoProfile }
  | { type: "sign-out" }
  | { type: "navigate"; section: DashboardSection }
  | { type: "toggle-menu" }
  | { type: "show-notice"; message: string }
  | { type: "open-sale" }
  | { type: "cancel-sale" }
  | { type: "begin-sale" }
  | { type: "finish-sale" }
  | { type: "reset-sale" };

export const initialDashboardDemoState: DashboardDemoState = {
  activeProfile: null,
  activeSection: "dashboard",
  mobileMenuOpen: false,
  saleStep: "idle",
  notice: "",
};

const adminSections: DashboardSection[] = [
  "dashboard",
  "news",
  "events",
  "reports",
  "enclosures",
  "users",
];

const ticketSections: DashboardSection[] = ["tickets", "ticket-history"];
const executiveSections: DashboardSection[] = ["dashboard", "reports"];

export function getSectionsForProfile(
  profile: DemoProfile,
): DashboardSection[] {
  if (profile === "administration") return adminSections;
  if (profile === "executive") return executiveSections;

  return ticketSections;
}

export function dashboardDemoReducer(
  state: DashboardDemoState,
  action: DashboardDemoAction,
): DashboardDemoState {
  switch (action.type) {
    case "start-session":
      return {
        ...state,
        activeProfile: action.profile,
        activeSection: action.profile === "ticket" ? "tickets" : "dashboard",
        mobileMenuOpen: false,
        notice: "",
      };
    case "sign-out":
      return {
        ...state,
        activeProfile: null,
        activeSection: "dashboard",
        mobileMenuOpen: false,
        saleStep: "idle",
        notice: "",
      };
    case "navigate":
      if (
        !state.activeProfile ||
        !getSectionsForProfile(state.activeProfile).includes(action.section)
      ) {
        return state;
      }
      return {
        ...state,
        activeSection: action.section,
        mobileMenuOpen: false,
        notice: "",
        saleStep: "idle",
      };
    case "toggle-menu":
      return { ...state, mobileMenuOpen: !state.mobileMenuOpen };
    case "show-notice":
      return { ...state, notice: action.message };
    case "open-sale":
      if (state.activeProfile !== "ticket") return state;
      return { ...state, saleStep: "confirmation", notice: "" };
    case "cancel-sale":
      return { ...state, saleStep: "idle" };
    case "begin-sale":
      if (state.activeProfile !== "ticket") return state;
      return { ...state, saleStep: "processing" };
    case "finish-sale":
      return state.saleStep === "processing"
        ? { ...state, saleStep: "complete" }
        : state;
    case "reset-sale":
      return { ...state, saleStep: "idle" };
    default:
      return state;
  }
}
