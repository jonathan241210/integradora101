import { describe, expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import {
  getNavigationForProfile,
  type DashboardNavigationItem,
} from "../viewmodels/navigation";

function profile(overrides: Partial<StaffProfile>): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles: ["admin"],
    permissions: [],
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
    ...overrides,
  };
}

const labels = (items: DashboardNavigationItem[]) => items.map((item) => item.label);

describe("CA-01 administration-sections", () => {
  it("muestra las seis secciones y «Usuarios» según los permisos de me", () => {
    const admin = profile({
      permissions: [
        "dashboard.view",
        "news.manage",
        "events.manage",
        "reports.view",
        "enclosures.manage",
        "users.manage",
      ],
    });

    expect(labels(getNavigationForProfile(admin))).toEqual([
      "Panel principal",
      "Noticias",
      "Eventos",
      "Reportes",
      "Recintos",
      "Usuarios",
    ]);
    expect(getNavigationForProfile(admin).map((item) => item.id)).toContain("users");
  });

  it("CA-01: «Usuarios» exige solo users.manage; zoo-admin no la recibe", () => {
    const admin = profile({
      roles: ["admin"],
      permissions: ["dashboard.view", "users.manage"],
    });
    const zooAdmin = profile({
      roles: ["zoo-admin"],
      permissions: ["dashboard.view", "news.manage", "events.manage"],
    });
    const withoutAccounts = profile({ permissions: ["dashboard.view", "news.manage"] });

    expect(labels(getNavigationForProfile(admin))).toContain("Usuarios");
    expect(labels(getNavigationForProfile(zooAdmin))).not.toContain("Usuarios");
    expect(labels(getNavigationForProfile(withoutAccounts))).not.toContain("Usuarios");
  });

  it("respeta cada permiso y ya no existe «Usuarios de taquilla»", () => {
    const onlyNews = profile({ permissions: ["news.manage"] });
    const everything = profile({
      permissions: [
        "dashboard.view",
        "news.manage",
        "events.manage",
        "reports.view",
        "enclosures.manage",
        "users.manage",
      ],
    });

    expect(labels(getNavigationForProfile(onlyNews))).toEqual(["Noticias"]);
    expect(labels(getNavigationForProfile(everything))).not.toContain("Usuarios de taquilla");
  });
});

describe("CA-13 administration-sections", () => {
  it("ofrece al executive solo Panel y Reporte, sin secciones de edición", () => {
    const executive = profile({
      roles: ["executive"],
      home: "executive",
      permissions: ["dashboard.view", "reports.view"],
    });

    expect(getNavigationForProfile(executive).map((item) => item.id)).toEqual([
      "dashboard",
      "reports",
    ]);
  });
});

describe("CA-01 ticket-sales", () => {
  it("«Venta» solo con tickets.create, «Historial» de taquilla con tickets.create y tickets.view y «Precios» con ticket-prices.manage", () => {
    const cashier = profile({
      roles: ["cashier"],
      home: "ticket",
      permissions: ["tickets.create", "tickets.view"],
    });
    const admin = profile({
      permissions: ["dashboard.view", "tickets.view", "tickets.view-all", "ticket-prices.manage"],
    });
    const zooAdmin = profile({
      roles: ["zoo-admin"],
      permissions: ["dashboard.view", "tickets.view", "tickets.view-all"],
    });

    expect(labels(getNavigationForProfile(cashier))).toEqual(["Venta", "Historial"]);
    // dashboard-020 CA-09, CA-11: el historial completo de admin vive en «Reportes»; «Historial» es de taquilla.
    expect(labels(getNavigationForProfile(admin))).toEqual(["Panel principal", "Reportes", "Precios"]);
    expect(labels(getNavigationForProfile(admin))).not.toContain("Venta");
    expect(labels(getNavigationForProfile(zooAdmin))).toEqual(["Panel principal", "Reportes"]);
  });

  it("no ofrece «Notificaciones» (diferido) ni secciones sin permiso", () => {
    const executive = profile({
      roles: ["executive"],
      home: "executive",
      permissions: ["dashboard.view", "reports.view"],
    });
    const all = profile({
      permissions: ["tickets.view", "ticket-prices.manage", "tickets.create"],
    });

    expect(labels(getNavigationForProfile(executive))).toEqual(["Panel principal", "Reportes"]);
    expect(labels(getNavigationForProfile(all))).not.toContain("Notificaciones");
    expect(labels(getNavigationForProfile(profile({ permissions: [], home: null })))).toEqual([]);
  });
});

describe("navegación de communications y executive (dashboard-017)", () => {
  const communications = profile({
    roles: ["communications"],
    home: "administration",
    permissions: [
      "news.manage",
      "events.manage",
      "memories.review",
      "species.review",
      "public-content.view",
    ],
  });

  it("CA-07 fixed-roles-account-management: communications ve Noticias, Eventos, Momentos y Zoopedia y su primera sección es Noticias", () => {
    const items = getNavigationForProfile(communications);

    expect(labels(items)).toEqual(["Noticias", "Eventos", "Momentos", "Zoopedia"]);
    expect(items[0]?.id).toBe("news");
  });

  it("CA-08 fixed-roles-account-management: communications no ve Usuarios, Panel ni Reporte", () => {
    const names = labels(getNavigationForProfile(communications));

    for (const hidden of ["Usuarios", "Panel principal", "Reportes"]) {
      expect(names).not.toContain(hidden);
    }
  });
});
