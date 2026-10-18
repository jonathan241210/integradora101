import {
  demoEnclosures,
  demoTicketUsers,
  type DemoEnclosure,
  type DemoTicketUser,
} from "../data/demo-data";

export type DashboardSection =
  | "dashboard"
  | "news"
  | "events"
  | "tickets"
  | "reports"
  | "enclosures"
  | "ticket-users"
  | "ticket-history";

export type DemoProfile = "administration" | "executive" | "ticket";

export type SaleStep = "idle" | "confirmation" | "processing" | "complete";

export type DashboardDemoState = {
  activeProfile: DemoProfile | null;
  activeSection: DashboardSection;
  mobileMenuOpen: boolean;
  saleStep: SaleStep;
  notice: string;
  ticketUsers: DemoTicketUser[];
  enclosures: DemoEnclosure[];
};

export type DashboardDemoAction =
  | { type: "start-session"; profile: DemoProfile }
  | { type: "sign-out" }
  | { type: "navigate"; section: DashboardSection }
  | { type: "toggle-menu" }
  | { type: "show-notice"; message: string }
  | {
      type: "update-enclosure";
      id: string;
      name: string;
      description: string;
      status: DemoEnclosure["status"];
    }
  | { type: "add-ticket-user"; name: string; username: string; password: string }
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
  ticketUsers: demoTicketUsers,
  enclosures: demoEnclosures,
};

const adminSections: DashboardSection[] = [
  "dashboard",
  "news",
  "events",
  "reports",
  "enclosures",
  "ticket-users",
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
    case "update-enclosure":
      if (state.activeProfile !== "administration") return state;
      if (!action.name.trim() || !action.description.trim()) {
        return { ...state, notice: "Completa el nombre y la descripción del recinto." };
      }
      return {
        ...state,
        enclosures: state.enclosures.map((enclosure) =>
          enclosure.id === action.id
            ? {
                ...enclosure,
                name: action.name.trim(),
                description: action.description.trim(),
                status: action.status,
              }
            : enclosure,
        ),
        notice: "Los cambios del recinto se guardaron en esta demostración.",
      };
    case "add-ticket-user": {
      if (state.activeProfile !== "administration") return state;
      const name = action.name.trim();
      const username = action.username.trim();
      if (!name || !username || !action.password.trim()) {
        return { ...state, notice: "Completa todos los campos para crear la cuenta." };
      }
      if (
        state.ticketUsers.some(
          (user) => user.username.toLocaleLowerCase() === username.toLocaleLowerCase(),
        )
      ) {
        return { ...state, notice: "Ese nombre de usuario ya existe en esta demostración." };
      }

      return {
        ...state,
        ticketUsers: [...state.ticketUsers, { id: username, name, username }],
        notice: "El registro de muestra se agregó solo a esta lista temporal.",
      };
    }
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
