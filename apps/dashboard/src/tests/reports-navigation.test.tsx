import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { getNavigationForProfile, sectionsForPermissions } from "../viewmodels/navigation";
import {
  availableReportTabs,
  defaultReportTab,
  resolveTicketRoute,
} from "../viewmodels/report-tabs";
import { resolveSelection } from "../viewmodels/focus-target";
import { searchActionCatalog, visibleSearchActions } from "../viewmodels/search-actions";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

function profile(permissions: string[], home: StaffProfile["home"] = "administration"): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles: [],
    permissions,
    home,
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

const admin = ["dashboard.view", "reports.view", "reports.cancellations.view", "tickets.view", "tickets.view-all", "ticket-prices.manage"];
const zooAdmin = ["dashboard.view", "reports.view", "tickets.view", "tickets.view-all"];
const executive = ["dashboard.view", "reports.view"];
const cashier = ["tickets.create", "tickets.view", "tickets.cancel"];
const labels = (permissions: string[], home: StaffProfile["home"] = "administration") =>
  getNavigationForProfile(profile(permissions, home)).map((item) => item.label);
const tabLabels = (permissions: string[]) => availableReportTabs(permissions).map((tab) => tab.label);

describe("CA-01 unified-reports-and-feedback", () => {
  it("muestra una sola entrada Reportes y ninguna entrada vieja", () => {
    for (const permissions of [admin, zooAdmin, executive]) {
      const names = labels(permissions);

      expect(names.filter((name) => name === "Reportes")).toHaveLength(1);
      expect(names).not.toContain("Reporte de boletos");
      expect(names).not.toContain("Cancelaciones");
    }
    expect(labels(["reports.cancellations.view"])).toEqual(["Reportes"]);
    expect(labels(["tickets.view-all"])).toEqual(["Reportes"]);
    expect(sectionsForPermissions(admin)).toContain("Reportes");
  });
});

describe("CA-02 unified-reports-and-feedback", () => {
  it("muestra cada pestaña solo con su permiso", () => {
    expect(tabLabels(["reports.view"])).toEqual(["Boletos"]);
    expect(tabLabels(["reports.cancellations.view"])).toEqual(["Cancelaciones"]);
    expect(tabLabels(["tickets.view-all"])).toEqual(["Historial"]);
    expect(tabLabels([])).toEqual([]);
  });
});

describe("CA-03 unified-reports-and-feedback", () => {
  it("fija las pestañas de admin, zoo-admin y executive; nadie más ve Reportes", () => {
    expect(tabLabels(admin)).toEqual(["Boletos", "Cancelaciones", "Historial"]);
    expect(tabLabels(zooAdmin)).toEqual(["Boletos", "Historial"]);
    expect(tabLabels(executive)).toEqual(["Boletos"]);
    expect(labels(cashier, "ticket")).not.toContain("Reportes");
    expect(labels(["news.manage", "events.manage", "memories.review", "species.review"])).not.toContain("Reportes");
  });
});

describe("CA-04 unified-reports-and-feedback", () => {
  it("abre por defecto la primera pestaña permitida en orden", () => {
    expect(defaultReportTab(availableReportTabs(admin))).toBe("tickets");
    expect(defaultReportTab(availableReportTabs(["reports.cancellations.view", "tickets.view-all"]))).toBe("cancellations");
    expect(defaultReportTab(availableReportTabs(["tickets.view-all"]))).toBe("history");
    expect(defaultReportTab([])).toBeNull();
  });
});

describe("CA-07 unified-reports-and-feedback", () => {
  it("oculta Cancelaciones y el historial completo a executive", () => {
    expect(tabLabels(executive)).not.toContain("Cancelaciones");
    expect(tabLabels(executive)).not.toContain("Historial");
    expect(labels(executive, "executive")).toEqual(["Panel principal", "Reportes"]);
    expect(resolveTicketRoute("ticket-history", ["dashboard", "reports"], executive)).toBeNull();
  });
});

describe("CA-09 unified-reports-and-feedback", () => {
  it("deja Venta e Historial juntos para cashier, sin Reportes", () => {
    expect(labels(cashier, "ticket")).toEqual(["Venta", "Historial"]);
    // El historial de taquilla conserva «Cancelar» (se decide con `cancellable` de la API).
    expect(visibleSearchActions(cashier, ["tickets", "ticket-history"]).map((entry) => entry.id)).toContain(
      "ticket-history.cancel",
    );
  });
});

describe("CA-10 unified-reports-and-feedback", () => {
  it("cuenta mixta muestra historial de taquilla y no el de Reportes", () => {
    const mixed = ["tickets.create", "tickets.view", "tickets.view-all"];

    expect(labels(mixed, "ticket")).toEqual(["Venta", "Historial"]);
    expect(tabLabels(mixed)).not.toContain("Historial");
  });
});

describe("CA-11 unified-reports-and-feedback", () => {
  it("no queda ningún identificador de Reporte de boletos ni Cancelaciones como sección", () => {
    for (const file of ["App.tsx", "viewmodels/dashboard-shell.ts", "viewmodels/navigation.ts"]) {
      const text = source(file);

      expect(text).not.toContain('"cancellations"');
      expect(text).not.toContain('title: "Cancelaciones"');
      expect(text).not.toContain("Reporte de boletos");
    }
    expect(source("App.tsx")).toContain('reports: "Reportes"');
  });
});

describe("CA-12 unified-reports-and-feedback", () => {
  it("la búsqueda y las acciones llevan solo a pestañas permitidas", () => {
    const adminNav = getNavigationForProfile(profile(admin)).map((item) => item.id);
    const cashierNav = getNavigationForProfile(profile(cashier, "ticket")).map((item) => item.id);

    expect(adminNav).not.toContain("ticket-history");
    expect(resolveTicketRoute("ticket-history", adminNav, admin)).toEqual({ section: "reports", tab: "history" });
    expect(resolveTicketRoute("ticket-history", cashierNav, cashier)).toEqual({ section: "ticket-history", tab: null });
    expect(resolveTicketRoute("reports", adminNav, admin)).toEqual({ section: "reports", tab: "tickets" });
    expect(resolveTicketRoute("ticket-history", ["dashboard"], admin)).toBeNull();

    // Todas las acciones del catálogo apuntan a una entrada que existe en la navegación.
    const exportAction = searchActionCatalog.find((entry) => entry.id === "reports.export");

    expect(exportAction?.section).toBe("reports");
    expect(exportAction?.sectionLabel).toBe("Reportes");
    expect(visibleSearchActions(admin, adminNav).map((entry) => entry.id)).not.toContain("ticket-history.cancel");

    // Un resultado de boleto que no está en la navegación se ignora salvo que App lo redirija.
    const hit = { section: "ticket-history", id: 7, kind: undefined, isSection: false, isAction: false, action: undefined };
    const context = { text: "7", nonce: 1, currentSection: "reports" as const };

    expect(resolveSelection(hit, { ...context, allowedSections: adminNav }).type).toBe("ignore");
    expect(resolveSelection(hit, { ...context, allowedSections: [...adminNav, "ticket-history"] }).type).toBe("focus");
    expect(source("App.tsx")).toContain("resolveTicketRoute");
  });
});
