import type { StaffProfile } from "@arca/api-client";
import type { DashboardSection } from "./dashboard-shell";
import type { IconName } from "@/components/Icon";
import { availableReportTabs } from "./report-tabs";

export type PresentationProfile = "administration" | "executive" | "ticket";

export type DashboardNavigationItem = {
  id: DashboardSection;
  label: string;
  icon: IconName;
};

type NavigationCandidate = {
  item: DashboardNavigationItem;
  /** Con `visible` la entrada la decide una regla pura de presentación (dashboard-020). */
  permission: string | string[];
  visible?: (granted: Set<string>) => boolean;
};

/**
 * Mapa permiso → sección (dashboard-005 CA-01, RN-01). Es solo presentación:
 * la API aplica la autorización. «Venta» exige `tickets.create`, que solo
 * tiene `cashier`; «Historial» exige `tickets.create` y `tickets.view` y «Precios»
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
    // dashboard-020 CA-01: una sola entrada «Reportes», con pestañas según permisos.
    item: { id: "reports", label: "Reportes", icon: "trend" },
    permission: ["reports.view", "reports.cancellations.view", "tickets.view-all"],
    visible: (granted) => availableReportTabs([...granted]).length > 0,
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
    item: { id: "memories", label: "Momentos", icon: "camera" },
    permission: "memories.review",
  },
  {
    item: { id: "tulanpedia", label: "TulanPedia", icon: "animals" },
    permission: "species.review",
  },
  {
    item: { id: "tickets", label: "Venta", icon: "ticket" },
    permission: "tickets.create",
  },
  {
    // Historial de taquilla junto a «Venta» (dashboard-020 CA-09, CA-10): exige crear y ver.
    item: { id: "ticket-history", label: "Historial", icon: "trend" },
    permission: "tickets.view",
    visible: (granted) => granted.has("tickets.create") && granted.has("tickets.view"),
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

function allows(candidate: NavigationCandidate, granted: Set<string>): boolean {
  if (candidate.visible) return candidate.visible(granted);

  return Array.isArray(candidate.permission)
    ? candidate.permission.some((item) => granted.has(item))
    : granted.has(candidate.permission);
}

/**
 * Etiquetas de las secciones que abre una lista de permisos (dashboard-017
 * CA-02). Reutiliza el mapa permiso → sección; es solo presentación.
 */
export function sectionsForPermissions(permissions: string[]): string[] {
  const granted = new Set(permissions);

  return navigationCandidates
    .filter((candidate) => allows(candidate, granted))
    .map(({ item }) => item.label);
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
    .filter((candidate) => allows(candidate, permissions))
    .map(({ item }) => item);
}
