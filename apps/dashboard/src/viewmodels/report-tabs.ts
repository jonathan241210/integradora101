import type { DashboardSection } from "./dashboard-shell";

/**
 * Pestañas de «Reportes» (dashboard-020 CA-02 a CA-07, RN-03, RN-05). Solo presentación:
 * la API autoriza cada endpoint (RN-01). Sin nombres de rol; solo permisos.
 */
export type ReportTabId = "tickets" | "cancellations" | "history";

export type ReportTab = {
  id: ReportTabId;
  label: string;
  permission: string;
};

/** Orden fijo: Boletos, Cancelaciones, Historial (RN-03). */
export const reportTabCatalog: ReportTab[] = [
  { id: "tickets", label: "Boletos", permission: "reports.view" },
  { id: "cancellations", label: "Cancelaciones", permission: "reports.cancellations.view" },
  { id: "history", label: "Historial", permission: "tickets.view-all" },
];

/**
 * Pestañas que la cuenta puede ver. Con `tickets.create` el historial es el de taquilla,
 * no una pestaña de Reportes (RN-05, CA-10).
 */
export function availableReportTabs(permissions: readonly string[]): ReportTab[] {
  const granted = new Set(permissions);

  return reportTabCatalog.filter((tab) => {
    if (!granted.has(tab.permission)) return false;
    if (tab.id === "history" && granted.has("tickets.create")) return false;

    return true;
  });
}

/** Pestaña por defecto: la primera permitida del orden (CA-04). */
export function defaultReportTab(tabs: readonly ReportTab[]): ReportTabId | null {
  return tabs[0]?.id ?? null;
}

export function isReportTabAllowed(tab: string, tabs: readonly ReportTab[]): tab is ReportTabId {
  return tabs.some((item) => item.id === tab);
}

/** Pestaña activa: la elegida si sigue permitida; si no, la primera permitida (CA-04, CA-06). */
export function resolveActiveReportTab(
  selected: ReportTabId | null,
  tabs: readonly ReportTab[],
): ReportTabId | null {
  return selected && isReportTabAllowed(selected, tabs) ? selected : defaultReportTab(tabs);
}

/** La acción de cancelar se decide por permiso, no por `cancellable` (RN-04, CA-08). */
export function canCancelInReports(permissions: readonly string[]): boolean {
  return permissions.includes("tickets.cancel");
}

/**
 * Teclado de la lista de pestañas (CA-31): flechas, Inicio y Fin; devuelve la pestaña
 * destino o `null` si la tecla no navega.
 */
export function tabForKey<Id extends string>(
  tabs: readonly { id: Id }[],
  current: Id,
  key: string,
): Id | null {
  if (tabs.length === 0) return null;
  const index = Math.max(0, tabs.findIndex((tab) => tab.id === current));

  switch (key) {
    case "ArrowRight":
    case "ArrowDown":
      return tabs[(index + 1) % tabs.length].id;
    case "ArrowLeft":
    case "ArrowUp":
      return tabs[(index - 1 + tabs.length) % tabs.length].id;
    case "Home":
      return tabs[0].id;
    case "End":
      return tabs[tabs.length - 1].id;
    default:
      return null;
  }
}

export type ReportsRoute = { section: DashboardSection; tab: ReportTabId | null };

/**
 * Destino de un resultado o acción de boletos de la búsqueda global (CA-12): la entrada de
 * taquilla si está en la navegación, o la pestaña permitida de «Reportes». `null` si la
 * cuenta no tiene ninguno de los dos destinos.
 */
export function resolveTicketRoute(
  section: string,
  navigationIds: readonly string[],
  permissions: readonly string[],
): ReportsRoute | null {
  const tabs = availableReportTabs(permissions);

  // La exportación del reporte de boletos vive en la pestaña «Boletos».
  if (section === "reports" && navigationIds.includes("reports")) {
    return { section: "reports", tab: isReportTabAllowed("tickets", tabs) ? "tickets" : null };
  }
  if (navigationIds.includes(section)) return { section: section as DashboardSection, tab: null };

  if (!navigationIds.includes("reports")) return null;
  if (section === "ticket-history" && isReportTabAllowed("history", tabs)) {
    return { section: "reports", tab: "history" };
  }

  return null;
}
