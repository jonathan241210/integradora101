import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dashboardShellReducer,
  initialDashboardShellState,
  type DashboardShellState,
} from "../viewmodels/dashboard-shell";
import { availableReportTabs, resolveActiveReportTab } from "../viewmodels/report-tabs";

const tabs = availableReportTabs(["reports.view", "reports.cancellations.view", "tickets.view-all"]);
const ids = tabs.map((tab) => tab.id);
const available = ["dashboard", "reports"] as const;

function inReports(): DashboardShellState {
  return dashboardShellReducer(initialDashboardShellState, {
    type: "navigate",
    section: "reports",
    available: [...available],
  });
}

describe("CA-05 unified-reports-and-feedback", () => {
  it("conserva la pestaña en la sección y la reinicia al volver", () => {
    const chosen = dashboardShellReducer(inReports(), { type: "select-reports-tab", tab: "history", available: ids });

    expect(chosen.activeSection).toBe("reports");
    expect(chosen.reportsTab).toBe("history");
    expect(resolveActiveReportTab(chosen.reportsTab, tabs)).toBe("history");

    // Sin salir de la sección (p. ej. abrir y cerrar el menú) la pestaña se conserva.
    expect(dashboardShellReducer(chosen, { type: "toggle-menu" }).reportsTab).toBe("history");

    const away = dashboardShellReducer(chosen, { type: "navigate", section: "dashboard", available: [...available] });
    const back = dashboardShellReducer(away, { type: "navigate", section: "reports", available: [...available] });

    expect(back.reportsTab).toBeNull();
    expect(resolveActiveReportTab(back.reportsTab, tabs)).toBe("tickets");
  });

  it("cambiar de pestaña no llama a la API de la anterior: solo se monta la activa, sin URL ni almacenamiento", () => {
    const section = readFileSync(new URL("../sections/ReportsSection.tsx", import.meta.url), "utf8");
    const shell = readFileSync(new URL("../viewmodels/dashboard-shell.ts", import.meta.url), "utf8");

    expect(section).toContain('active === "tickets" && <TicketReportSection');
    expect(section).toContain('active === "cancellations" && <CancellationReportSection');
    expect(section).toContain('active === "history" && (');
    expect(shell).not.toMatch(/localStorage|sessionStorage|document\.cookie|history\.pushState/);
  });
});

describe("CA-06 unified-reports-and-feedback", () => {
  it("ignora la selección de una pestaña no permitida", () => {
    const executiveTabs = availableReportTabs(["reports.view"]).map((tab) => tab.id);
    const start = inReports();
    const next = dashboardShellReducer(start, {
      type: "select-reports-tab",
      tab: "cancellations",
      available: executiveTabs,
    });

    expect(next).toBe(start);
    expect(resolveActiveReportTab("cancellations", availableReportTabs(["reports.view"]))).toBe("tickets");
  });
});
