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

const bannerText = "Prototipo de demostración.";

const adminPermissions = [
  "dashboard.view",
  "news.manage",
  "events.manage",
  "reports.view",
  "enclosures.manage",
  "users.manage",
  "operational-staff.manage",
  "tickets.create",
  "tickets.view",
];

function render(
  home: "administration" | "ticket",
  activeProfile: "administration" | "ticket",
  activeSection: string,
) {
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
        roles: [home === "ticket" ? "cashier" : "admin"],
        permissions: adminPermissions,
        home,
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
    state: { ...initialDashboardDemoState, activeProfile, activeSection },
    startSession: vi.fn(),
    signOut: vi.fn(),
    navigate: vi.fn(),
    toggleMenu: vi.fn(),
    showNotice: vi.fn(),
    openSale: vi.fn(),
    cancelSale: vi.fn(),
    beginSale: vi.fn(),
    resetSale: vi.fn(),
  });

  return renderToStaticMarkup(<App />);
}

const connectedSections = [
  "dashboard",
  "news",
  "events",
  "reports",
  "enclosures",
  "users",
] as const;

describe("CA-02 administration-sections", () => {
  it.each(connectedSections)(
    "no muestra el aviso de demostración en la sección conectada %s",
    (section) => {
      const markup = render("administration", "administration", section);

      expect(markup).not.toContain(bannerText);
    },
  );

  it.each(["tickets", "ticket-history"] as const)(
    "conserva una sola advertencia de demostración en %s",
    (section) => {
      const markup = render("ticket", "ticket", section);

      expect(markup.match(/Prototipo de demostración\./g) ?? []).toHaveLength(1);
    },
  );
});

describe("CA-15 admin-dashboard-prototype", () => {
  it.each(["tickets", "ticket-history"] as const)(
    "la shell sigue mostrando una sola advertencia general en la sección de demostración %s",
    (section) => {
      const markup = render("ticket", "ticket", section);

      expect(markup.match(/Prototipo de demostración\./g) ?? []).toHaveLength(1);
    },
  );
});
