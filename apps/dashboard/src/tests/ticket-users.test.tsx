import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketUsersView } from "../views/TicketUsersView";
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

describe("CA-12 admin-dashboard-prototype", () => {
  it("muestra la cuenta ficticia y el formulario accesible de alta", () => {
    const state = administrativeState();
    const markup = renderToStaticMarkup(
      <TicketUsersView users={state.ticketUsers} onAdd={() => undefined} />,
    );

    expect(markup).toContain("Usuarios de taquilla");
    expect(markup).toContain("taquilla@demo.local");
    expect(markup).toContain('for="ticket-user-name"');
    expect(markup).toContain('for="ticket-user-username"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain("antes de recargar");
    expect(markup).not.toContain("demo1234");
  });

  it("permite usar la cuenta creada tras cambiar de perfil en la misma carga", () => {
    const admin = administrativeState();
    const created = dashboardDemoReducer(admin, {
      type: "add-ticket-user",
      name: "Usuario de muestra",
      username: "usuario@demo.local",
      password: " clave-demo ",
    });
    const signedOut = dashboardDemoReducer(created, { type: "sign-out" });
    const ticketSelected = dashboardDemoReducer(signedOut, {
      type: "select-profile",
      profile: "ticket",
    });
    const ticketLoggedIn = dashboardDemoReducer(ticketSelected, {
      type: "login-ticket",
      username: "usuario@demo.local",
      password: " clave-demo ",
    });

    expect(created.ticketUsers).toHaveLength(admin.ticketUsers.length + 1);
    expect(signedOut.ticketUsers).toEqual(created.ticketUsers);
    expect(ticketLoggedIn.activeProfile).toBe("ticket");
    expect(ticketLoggedIn.activeTicketUser).toBe("Usuario de muestra");
    expect(initialDashboardDemoState.ticketUsers).toHaveLength(1);
  });

  it("documenta credenciales, recorrido y límites de la demostración", () => {
    const guide = readFileSync(
      new URL("../../docs/manual-demo.md", import.meta.url),
      "utf8",
    );
    expect(guide).toContain("taquilla@demo.local");
    expect(guide).toContain("demo1234");
    expect(guide).toContain("No son credenciales reales");
    expect(guide).toContain("al recargar la página");
  });
});
