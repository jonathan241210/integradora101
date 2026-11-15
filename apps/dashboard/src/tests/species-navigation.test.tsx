import { expect, it } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { getNavigationForProfile } from "../viewmodels/navigation";
import { tulanpediaTabs } from "../viewmodels/tulanpedia-tab";

function profile(roles: string[], permissions: string[]): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles,
    permissions,
    home: "administration",
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

const labels = (p: StaffProfile) => getNavigationForProfile(p).map((item) => item.label);

it("CA-01 species-navigation: «TulanPedia» solo con species.review; admin, executive, cashier y veterinarian no la ven", () => {
  const director = profile(["zoo-admin"], ["dashboard.view", "species.review"]);

  expect(labels(director)).toContain("TulanPedia");
  expect(getNavigationForProfile(director).map((item) => item.id)).toContain("tulanpedia");
  // Una sola entrada: ya no hay entradas separadas.
  expect(labels(director)).not.toContain("Solicitudes de especies");
  expect(labels(director)).not.toContain("Especies publicadas");
  expect(labels(director).filter((name) => name === "TulanPedia")).toHaveLength(1);

  for (const role of ["admin", "executive", "cashier", "veterinarian"]) {
    expect(labels(profile([role], ["dashboard.view"]))).not.toContain("TulanPedia");
  }
});

it("CA-50 species-navigation: la pestaña «Publicadas» solo aparece con species.review", () => {
  const withPermission = profile(["zoo-admin"], ["dashboard.view", "species.review"]);
  const without = profile(["admin"], ["dashboard.view", "users.manage"]);

  // La pestaña vive dentro de la única entrada «TulanPedia», que exige el permiso.
  expect(labels(withPermission)).toContain("TulanPedia");
  expect(labels(without)).not.toContain("TulanPedia");
  expect(tulanpediaTabs.map((tab) => tab.label)).toEqual(["Solicitudes", "Publicadas"]);
});
