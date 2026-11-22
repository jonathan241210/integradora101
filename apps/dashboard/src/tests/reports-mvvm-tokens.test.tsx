import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const sharedComponents = [
  "components/ReportExportButtons.tsx",
  "components/ReportPeriodControls.tsx",
  "components/ReportTotals.tsx",
  "components/ReportViewState.tsx",
  "components/ReportTabs.tsx",
  "sections/ReportsSection.tsx",
];

describe("CA-18 unified-reports-and-feedback", () => {
  it("los componentes compartidos usan solo tokens y no calculan", () => {
    for (const file of sharedComponents) {
      const text = source(file);

      expect(text, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(text, file).not.toMatch(/\brgba?\(|\bhsla?\(/);
      expect(text, file).not.toMatch(/\.reduce\(|\bpermissions\b|\.roles\b/);
    }
    const css = source("styles.css").slice(source("styles.css").indexOf("dashboard-020"));

    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).toContain("var(--primary)");
  });
});

describe("CA-29 unified-reports-and-feedback", () => {
  it("no cambia packages/api-client ni añade llamadas", () => {
    // Sin llamadas nuevas: ningún archivo nuevo o de reportes toca la API ni los paquetes.
    for (const file of ["views/TicketReportView.tsx", "views/CancellationReportView.tsx", "components/DashboardNotifications.tsx"]) {
      expect(source(file), file).not.toMatch(/\bfetch\(|axios|adminApi|@arca\/api-client/);
    }
    for (const file of sharedComponents) {
      expect(source(file), file).not.toMatch(/\bfetch\(|axios|adminApi|@arca\/api-client/);
    }
    // Los viewmodels nuevos no importan servicios.
    for (const file of ["report-tabs", "report-export", "report-period", "feedback-policy"]) {
      expect(source(`viewmodels/${file}.ts`), file).not.toMatch(/services\/|fetch\(|axios/);
    }
  });
});

describe("CA-30 unified-reports-and-feedback", () => {
  it("las decisiones viven en viewmodels puros y los componentes no deciden por rol", () => {
    for (const file of ["report-tabs", "report-export", "report-period", "feedback-policy"]) {
      expect(source(`viewmodels/${file}.ts`), file).not.toMatch(/from "react"|\bdocument\b|\bwindow\b/);
    }
    for (const file of [...sharedComponents, "components/DashboardNotifications.tsx", "views/TicketReportView.tsx", "views/CancellationReportView.tsx"]) {
      expect(source(file), file).not.toMatch(/\bfetch\(|axios/);
      expect(source(file), file).not.toMatch(/\.(includes|has)\(["'](admin|zoo-admin|executive|cashier)["']\)|roles\.(includes|some)/);
    }
    expect(source("viewmodels/navigation.ts")).toContain("availableReportTabs");
    expect(source("components/DashboardNotifications.tsx")).toContain("actionErrorPresentation");
  });
});
