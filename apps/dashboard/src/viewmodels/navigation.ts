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

  const items = candidates
    .filter(({ permission }) =>
      Array.isArray(permission)
        ? permission.some((item) => permissions.has(item))
        : permissions.has(permission),
    )
    .map(({ item }) => item);

  if (profile.home === "administration") {
    if (permissions.has("users.manage")) {
      items.push({ id: "users", label: "Gestión de usuarios", icon: "users" });
    } else if (permissions.has("operational-staff.manage")) {
      items.push({ id: "ticket-users", label: "Personal operativo", icon: "users" });
    }
  }

  return items;
}
