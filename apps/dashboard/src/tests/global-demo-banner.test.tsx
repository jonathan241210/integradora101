import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import App from "../App";
import { initialDashboardDemoState } from "../viewmodels/dashboard-demo";

const { useDashboardDemo } = vi.hoisted(() => ({
  useDashboardDemo: vi.fn(),
}));

vi.mock("../viewmodels/useDashboardDemo", () => ({ useDashboardDemo }));

const authenticatedSections = [
  ["administration", "dashboard"],
  ["administration", "news"],
  ["administration", "events"],
  ["administration", "reports"],
  ["administration", "enclosures"],
  ["administration", "ticket-users"],
] as const;

describe("CA-15 admin-dashboard-prototype", () => {
  it.each(authenticatedSections)(
    "muestra una sola advertencia general para administración en %s",
    (activeProfile, activeSection) => {
      useDashboardDemo.mockReturnValue({
        state: {
          ...initialDashboardDemoState,
          activeProfile,
          activeSection,
        },
        selectProfile: vi.fn(),
        loginAdministration: vi.fn(),
        loginTicket: vi.fn(),
        signOut: vi.fn(),
        navigate: vi.fn(),
        toggleMenu: vi.fn(),
        showNotice: vi.fn(),
        updateEnclosure: vi.fn(),
        addTicketUser: vi.fn(),
        openSale: vi.fn(),
        cancelSale: vi.fn(),
        beginSale: vi.fn(),
        resetSale: vi.fn(),
      });

      const markup = renderToStaticMarkup(<App />);
      const banners = markup.match(/Prototipo de demostración\./g) ?? [];

      expect(banners).toHaveLength(1);
    },
  );
});
