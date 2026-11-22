import { describe, expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { dashboardShellReducer, initialDashboardShellState } from "../viewmodels/dashboard-shell";
import { getNavigationForProfile } from "../viewmodels/navigation";
import { availableReportTabs } from "../viewmodels/report-tabs";

function profile(permissions: string[]): StaffProfile {
  return {
    id: 1,
    first_name: "Admin",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Admin Prueba",
    email: "admin@test.arca.invalid",
    department: null,
    roles: ["admin"],
    permissions,
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

describe("CA-01 ticket-cancellation-report", () => {
  it("test_ca01_entry_only_with_cancellations_permission", () => {
    // dashboard-020 CA-01, CA-02, CA-11: «Cancelaciones» es pestaña de «Reportes», no entrada propia.
    const withPermission = getNavigationForProfile(
      profile(["dashboard.view", "reports.cancellations.view"]),
    );
    const without = getNavigationForProfile(profile(["dashboard.view"]));

    expect(withPermission.map((item) => item.label)).toContain("Reportes");
    expect(withPermission.map((item) => item.label)).not.toContain("Cancelaciones");
    expect(without.map((item) => item.label)).not.toContain("Reportes");
    expect(availableReportTabs(["reports.cancellations.view"]).map((tab) => tab.label)).toEqual([
      "Cancelaciones",
    ]);
    expect(availableReportTabs(["reports.view"]).map((tab) => tab.label)).not.toContain("Cancelaciones");
  });

  it("sin el permiso la shell no navega a la sección (la API sigue autorizando)", () => {
    const available = getNavigationForProfile(profile(["dashboard.view"])).map((item) => item.id);
    const next = dashboardShellReducer(initialDashboardShellState, {
      type: "navigate",
      section: "reports",
      available,
    });

    expect(next.activeSection).toBe("dashboard");
  });
});
