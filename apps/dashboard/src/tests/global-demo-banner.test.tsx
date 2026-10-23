import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { initialDashboardDemoState } from "../viewmodels/dashboard-demo";

const { useAuthSession, useDashboardDemo } = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useDashboardDemo: vi.fn(),
}));

vi.mock("../viewmodels/useAuthSession", () => ({ useAuthSession }));
vi.mock("../viewmodels/useDashboardDemo", () => ({ useDashboardDemo }));

const authenticatedSections = [
  ["administration", "dashboard"],
  ["administration", "news"],
  ["administration", "events"],
  ["administration", "reports"],
  ["administration", "enclosures"],
  ["administration", "users"],
  ["administration", "ticket-users"],
] as const;

describe("CA-15 admin-dashboard-prototype", () => {
  it.each(authenticatedSections)(
    "muestra una sola advertencia general para administración en %s / %s",
    (activeProfile, activeSection) => {
      const permissions = [
        "dashboard.view",
        "news.manage",
        "events.manage",
        "reports.view",
        "enclosures.manage",
        "operational-staff.manage",
      ];
      if (activeSection !== "ticket-users") permissions.push("users.manage");
      useAuthSession.mockReturnValue({
        state: {
          status: "authenticated",
          profile: {
            id: 1,
            first_name: "Personal",
            last_name: "Prueba",
            second_last_name: null,
            full_name: "Personal Prueba",
            email: "personal@test.arca.invalid",
            department: null,
            roles: [activeSection === "ticket-users" ? "zoo-admin" : "admin"],
            permissions,
            home: "administration",
            pwa_url: null,
            two_factor_setup_required: false,
          },
          error: "",
          sessionExpired: false,
          submitting: false,
          qrSvg: null,
          recoveryCodes: [],
        },
        login: vi.fn(),
        challenge: vi.fn(),
        confirmSetup: vi.fn(),
        acknowledgeCodes: vi.fn(),
        logout: vi.fn(),
      });
      useDashboardDemo.mockReturnValue({
        state: {
          ...initialDashboardDemoState,
          activeProfile,
          activeSection,
        },
        startSession: vi.fn(),
        signOut: vi.fn(),
        navigate: vi.fn(),
        toggleMenu: vi.fn(),
        showNotice: vi.fn(),
        updateEnclosure: vi.fn(),
        openSale: vi.fn(),
        cancelSale: vi.fn(),
        beginSale: vi.fn(),
        resetSale: vi.fn(),
      });

      const markup = renderToStaticMarkup(<App />);
      const banners = markup.match(/Prototipo de demostración\./g) ?? [];

      expect(banners).toHaveLength(
        activeSection === "users" || activeSection === "ticket-users" ? 0 : 1,
      );
    },
  );
});
