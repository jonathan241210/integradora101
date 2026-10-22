import type { StaffProfile } from "@arca/api-client";
import type { DashboardSection, DemoProfile } from "./dashboard-demo";
import type { IconName } from "@/components/Icon";

export type DashboardNavigationItem = {
  id: DashboardSection;
  label: string;
  icon: IconName;
};

const administrationNavigation: {
  item: DashboardNavigationItem;
  permission: string | string[];
}[] = [
  {
    item: { id: "dashboard", label: "Panel principal", icon: "dashboard" },
    permission: "dashboard.view",
  },
  {
    item: { id: "news", label: "Noticias", icon: "news" },
    permission: "news.manage",
  },
  {
    item: { id: "events", label: "Eventos", icon: "calendar" },
    permission: "events.manage",
  },
  {
    item: { id: "reports", label: "Reporte de boletos", icon: "trend" },
    permission: "reports.view",
  },
  {
    item: { id: "enclosures", label: "Modificación de recintos", icon: "building" },
    permission: "enclosures.manage",
  },
  {
    item: { id: "ticket-users", label: "Usuarios de taquilla", icon: "users" },
    permission: ["users.manage", "operational-staff.manage"],
  },
];

const executiveNavigation: {
  item: DashboardNavigationItem;
  permission: string;
}[] = [
  {
    item: { id: "dashboard", label: "Panel principal", icon: "dashboard" },
    permission: "dashboard.view",
  },
  {
    item: { id: "reports", label: "Reporte de boletos", icon: "trend" },
    permission: "reports.view",
  },
];

const ticketNavigation: {
  item: DashboardNavigationItem;
  permission: string;
}[] = [
  {
    item: { id: "tickets", label: "Venta de boletos", icon: "ticket" },
    permission: "tickets.create",
  },
  {
    item: { id: "ticket-history", label: "Historial de boletos", icon: "trend" },
    permission: "tickets.view",
  },
];

export function getPresentationProfile(home: StaffProfile["home"]): DemoProfile | null {
  switch (home) {
    case "administration":
      return "administration";
    case "executive":
      return "executive";
    case "ticket":
      return "ticket";
    default:
      return null;
  }
}

export function getNavigationForProfile(
  profile: StaffProfile,
): DashboardNavigationItem[] {
  const permissions = new Set(profile.permissions);
  const candidates =
    profile.home === "administration"
      ? administrationNavigation
      : profile.home === "executive"
        ? executiveNavigation
        : profile.home === "ticket"
          ? ticketNavigation
          : [];

  return candidates
    .filter(({ permission }) =>
      Array.isArray(permission)
        ? permission.some((item) => permissions.has(item))
        : permissions.has(permission),
    )
    .map(({ item }) => item);
}
