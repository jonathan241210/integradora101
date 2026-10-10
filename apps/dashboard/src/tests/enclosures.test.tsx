import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EnclosuresView } from "../views/EnclosuresView";
import {
  dashboardDemoReducer,
  initialDashboardDemoState,
} from "../viewmodels/dashboard-demo";

function administrativeState() {
  const selected = dashboardDemoReducer(initialDashboardDemoState, {
    type: "select-profile",
    profile: "administration",
  });
  return dashboardDemoReducer(selected, {
    type: "login-administration",
    username: "administrador@demo.local",
    password: "demo1234",
  });
}

describe("CA-09 admin-dashboard-prototype", () => {
  it("presenta formularios accesibles de recintos ficticios", () => {
    const state = administrativeState();
    const markup = renderToStaticMarkup(
      <EnclosuresView
        enclosures={state.enclosures}
        onUpdate={() => undefined}
      />,
    );

    expect(markup).toContain("Modificación de recintos");
    expect(markup).toContain("Zona de felinos");
    expect(markup).toContain('for="enclosure-felinos-name"');
    expect(markup).toContain("Guardar cambios de muestra");
    expect(markup).toContain("desaparecen al recargar");
  });

  it("actualiza solo el estado temporal del recinto en la demostración", () => {
    const state = administrativeState();
    const updated = dashboardDemoReducer(state, {
      type: "update-enclosure",
      id: "felinos",
      name: "Recinto actualizado",
      description: "Descripción de prueba.",
      status: "Cerrado",
    });

    expect(updated.enclosures[0]).toMatchObject({
      name: "Recinto actualizado",
      description: "Descripción de prueba.",
      status: "Cerrado",
    });
    expect(state.enclosures[0].name).toBe("Zona de felinos");
  });

  it("muestra error si el nombre o la descripción se dejan vacíos", () => {
    const state = administrativeState();
    const invalid = dashboardDemoReducer(state, {
      type: "update-enclosure",
      id: "felinos",
      name: " ",
      description: "",
      status: "Abierto",
    });

    expect(invalid.notice).toContain("Completa el nombre");
    expect(invalid.enclosures[0].name).toBe("Zona de felinos");
  });
});
