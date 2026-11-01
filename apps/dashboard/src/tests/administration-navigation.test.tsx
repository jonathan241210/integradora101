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
      "Reporte de boletos",
      "Recintos",
      "Usuarios",
    ]);
    expect(getNavigationForProfile(admin).map((item) => item.id)).toContain("users");
  });

  it("muestra «Usuarios» con operational-staff.manage y lo oculta sin ningún permiso de cuentas", () => {
    const zooAdmin = profile({
      roles: ["zoo-admin"],
      permissions: ["dashboard.view", "operational-staff.manage"],
    });
    const withoutAccounts = profile({ permissions: ["dashboard.view", "news.manage"] });

    expect(labels(getNavigationForProfile(zooAdmin))).toContain("Usuarios");
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
        "operational-staff.manage",
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
