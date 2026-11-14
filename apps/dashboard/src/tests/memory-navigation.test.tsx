import { expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { getNavigationForProfile } from "../viewmodels/navigation";

function profile(overrides: Partial<StaffProfile>): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles: ["zoo-admin"],
    permissions: [],
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
    ...overrides,
  };
}

const labels = (value: StaffProfile) => getNavigationForProfile(value).map((item) => item.label);

it("CA-01 memory-navigation: «Momentos» aparece solo con memories.review", () => {
  const reviewer = profile({ permissions: ["dashboard.view", "memories.review"] });
  const without = profile({ permissions: ["dashboard.view", "news.manage"] });

  expect(labels(reviewer)).toContain("Momentos");
  expect(getNavigationForProfile(reviewer).find((item) => item.id === "memories")).toMatchObject({
    icon: "camera",
  });
  expect(labels(without)).not.toContain("Momentos");
});

it("CA-01 memory-navigation: admin, executive, cashier y veterinarian no ven «Momentos»", () => {
  const cases: Partial<StaffProfile>[] = [
    {
      roles: ["admin"],
      permissions: ["dashboard.view", "news.manage", "events.manage", "users.manage", "species.review"],
    },
    { roles: ["executive"], home: "executive", permissions: ["dashboard.view", "reports.view"] },
    { roles: ["cashier"], home: "ticket", permissions: ["tickets.create", "tickets.view"] },
    { roles: ["veterinarian"], home: null, permissions: ["public-content.view"] },
  ];

  for (const overrides of cases) {
    expect(labels(profile(overrides)), String(overrides.roles)).not.toContain("Momentos");
  }
});

it("CA-01 memory-navigation: el orden de las secciones existentes no cambia", () => {
  const all = profile({
    permissions: [
      "dashboard.view",
      "news.manage",
      "events.manage",
      "reports.view",
      "enclosures.manage",
      "users.manage",
      "memories.review",
      "species.review",
    ],
  });

  expect(labels(all)).toEqual([
    "Panel principal",
    "Noticias",
    "Eventos",
    "Reporte de boletos",
    "Recintos",
    "Usuarios",
    "Momentos",
    "TulanPedia",
  ]);

  const without = profile({ permissions: all.permissions.filter((item) => item !== "memories.review") });

  expect(labels(without)).toEqual(labels(all).filter((label) => label !== "Momentos"));
});
