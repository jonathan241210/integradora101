import type { StaffProfile } from "@arca/api-client";
import type { DashboardSection } from "./dashboard-shell";
import type { IconName } from "@/components/Icon";

export type PresentationProfile = "administration" | "executive" | "ticket";

export type DashboardNavigationItem = {
  id: DashboardSection;
  label: string;
  icon: IconName;
};

type NavigationCandidate = {
  item: DashboardNavigationItem;
  permission: string | string[];
};

/**
 * Mapa permiso → sección (dashboard-005 CA-01, RN-01). Es solo presentación:
 * la API aplica la autorización. «Venta» exige `tickets.create`, que solo
 * tiene `cashier`; «Historial» exige `tickets.view` y «Precios»
 * `ticket-prices.manage`.
 */
const navigationCandidates: NavigationCandidate[] = [
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
    item: { id: "enclosures", label: "Recintos", icon: "building" },
    permission: "enclosures.manage",
  },
  {
    item: { id: "users", label: "Usuarios", icon: "users" },
    permission: "users.manage",
  },
  {
    item: { id: "tickets", label: "Venta", icon: "ticket" },
    permission: "tickets.create",
  },
  {
    item: { id: "ticket-history", label: "Historial", icon: "trend" },
    permission: "tickets.view",
  },
  {
    item: { id: "ticket-prices", label: "Precios", icon: "ticket" },
    permission: "ticket-prices.manage",
  },
];

export function getPresentationProfile(home: StaffProfile["home"]): PresentationProfile | null {
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
  const hasPortal =
    profile.home === "administration" ||
    profile.home === "executive" ||
    profile.home === "ticket";

  if (!hasPortal) return [];

  return navigationCandidates
    .filter(({ permission }) =>
      Array.isArray(permission)
        ? permission.some((item) => permissions.has(item))
        : permissions.has(permission),
    )
    .map(({ item }) => item);
}
