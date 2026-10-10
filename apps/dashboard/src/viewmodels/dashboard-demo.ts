import {
  demoAdministrationCredentials,
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

export type DemoProfile = "administration" | "ticket";

export type SaleStep = "idle" | "confirmation" | "processing" | "complete";

export type DashboardDemoState = {
  selectedProfile: DemoProfile | null;
  activeProfile: DemoProfile | null;
  activeSection: DashboardSection;
  mobileMenuOpen: boolean;
  saleStep: SaleStep;
  notice: string;
  ticketUsers: DemoTicketUser[];
  enclosures: DemoEnclosure[];
  activeTicketUser: string;
};

export type DashboardDemoAction =
  | { type: "select-profile"; profile: DemoProfile }
  | { type: "login-administration"; username: string; password: string }
  | { type: "login-ticket"; username: string; password: string }
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
  selectedProfile: null,
  activeProfile: null,
  activeSection: "dashboard",
  mobileMenuOpen: false,
  saleStep: "idle",
  notice: "",
  ticketUsers: demoTicketUsers,
  enclosures: demoEnclosures,
  activeTicketUser: "",
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

export function getSectionsForProfile(
  profile: DemoProfile,
): DashboardSection[] {
  return profile === "administration" ? adminSections : ticketSections;
}

export function dashboardDemoReducer(
  state: DashboardDemoState,
  action: DashboardDemoAction,
): DashboardDemoState {
  switch (action.type) {
    case "select-profile":
      return {
        ...state,
        selectedProfile: action.profile,
        notice: "",
      };
    case "login-administration":
      if (
        state.selectedProfile !== "administration" ||
        action.username.trim().toLocaleLowerCase() !==
          demoAdministrationCredentials.username ||
        action.password !== demoAdministrationCredentials.password
      ) {
        return {
          ...state,
          notice: "El usuario o la contraseña no son correctos.",
        };
      }
      return {
        ...state,
        activeProfile: "administration",
        activeSection: "dashboard",
        notice: "",
      };
    case "login-ticket": {
      const username = action.username.trim().toLocaleLowerCase();
      const ticketUser = state.ticketUsers.find(
        (user) =>
          user.username.toLocaleLowerCase() === username &&
          user.password === action.password,
      );

      if (state.selectedProfile !== "ticket" || !ticketUser) {
        return {
          ...state,
          notice: "El usuario o la contraseña no son correctos.",
        };
      }

      return {
        ...state,
        activeProfile: "ticket",
        activeTicketUser: ticketUser.name,
        activeSection: "tickets",
        notice: "",
      };
    }
    case "sign-out":
      return {
        ...state,
        selectedProfile: null,
        activeProfile: null,
        activeSection: "dashboard",
        mobileMenuOpen: false,
        saleStep: "idle",
        notice: "",
        activeTicketUser: "",
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
      const password = action.password;
      if (!name || !username || !password.trim()) {
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
        ticketUsers: [...state.ticketUsers, { id: username, name, username, password }],
        notice: "La cuenta de taquilla se creó solo para esta demostración.",
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
