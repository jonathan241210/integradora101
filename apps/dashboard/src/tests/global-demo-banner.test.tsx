import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { initialDashboardShellState } from "../viewmodels/dashboard-shell";

const { useAuthSession, useDashboardShell } = vi.hoisted(() => ({
  useAuthSession: vi.fn(),
  useDashboardShell: vi.fn(),
}));

vi.mock("../viewmodels/useAuthSession", () => ({ useAuthSession }));
vi.mock("../viewmodels/useDashboardShell", () => ({ useDashboardShell }));

const bannerText = "Prototipo de demostración.";

const adminPermissions = [
  "dashboard.view",
  "news.manage",
  "events.manage",
  "reports.view",
  "enclosures.manage",
  "users.manage",
  "tickets.view",
  "ticket-prices.manage",
];
const cashierPermissions = ["tickets.create", "tickets.view"];

function render(home: "administration" | "ticket", activeSection: string) {
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
        permissions: home === "ticket" ? cashierPermissions : adminPermissions,
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
  useDashboardShell.mockReturnValue({
    state: { ...initialDashboardShellState, activeSection },
    reset: vi.fn(),
    navigate: vi.fn(),
    toggleMenu: vi.fn(),
    closeMenu: vi.fn(),
    showNotice: vi.fn(),
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

describe("CA-02 ticket-sales", () => {
  it.each(["tickets", "ticket-history"] as const)(
    "la vista %s del cajero no muestra aviso de demostración ni datos ficticios",
    (section) => {
      const markup = render("ticket", section);

      expect(markup).not.toContain(bannerText);
      expect(markup).not.toContain("demo-banner");
      expect(markup).not.toMatch(/MUESTRA-\d+|ficticio|de muestra|Datos ficticios/i);
    },
  );

  it("Historial y Precios del administrador tampoco muestran el aviso", () => {
    for (const section of ["ticket-history", "ticket-prices"]) {
      const markup = render("administration", section);

      expect(markup).not.toContain(bannerText);
      expect(markup).not.toMatch(/MUESTRA-\d+|Datos ficticios/i);
    }
  });

  it("App ya no usa DemoBanner ni el estado de demostración de venta", () => {
    const source = readFileSync(fileURLToPath(new URL("../App.tsx", import.meta.url)), "utf8");

    expect(source).not.toMatch(/DemoBanner|useDashboardDemo|dashboard-demo|demo-data/);
    expect(existsSync(fileURLToPath(new URL("../components/DemoBanner.tsx", import.meta.url)))).toBe(false);
    expect(existsSync(fileURLToPath(new URL("../data/demo-data.ts", import.meta.url)))).toBe(false);
  });
});

describe("CA-02 administration-sections", () => {
  it.each(connectedSections)(
    "no muestra el aviso de demostración en la sección conectada %s",
    (section) => {
      const markup = render("administration", section);

      expect(markup).not.toContain(bannerText);
    },
  );

  it.each(["tickets", "ticket-history"] as const)(
    "Venta e Historial ya no conservan el aviso de demostración (reemplazado por dashboard-005) en %s",
    (section) => {
      expect(render("ticket", section)).not.toContain(bannerText);
    },
  );
});
