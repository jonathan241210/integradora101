import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TicketUsersView } from "../views/TicketUsersView";
import {
  dashboardDemoReducer,
  initialDashboardDemoState,
} from "../viewmodels/dashboard-demo";

function administrativeState() {
  return dashboardDemoReducer(initialDashboardDemoState, {
    type: "start-session",
    profile: "administration",
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
    expect(markup).toContain("mientras esta página siga abierta");
    expect(markup).not.toContain("demo1234");
  });

  it("mantiene la nueva entrada de muestra en memoria sin habilitar un login ficticio", () => {
    const admin = administrativeState();
    const created = dashboardDemoReducer(admin, {
      type: "add-ticket-user",
      name: "Usuario de muestra",
      username: "usuario@demo.local",
      password: " clave-demo ",
    });
    const signedOut = dashboardDemoReducer(created, { type: "sign-out" });

    expect(created.ticketUsers).toHaveLength(admin.ticketUsers.length + 1);
    expect(created.ticketUsers.at(-1)).toEqual({
      id: "usuario@demo.local",
      name: "Usuario de muestra",
      username: "usuario@demo.local",
    });
    expect(signedOut.ticketUsers).toEqual(created.ticketUsers);
    expect(initialDashboardDemoState.ticketUsers).toHaveLength(1);
  });

  it("documenta credenciales, recorrido y límites de la demostración", () => {
    const guide = readFileSync(
      new URL("../../docs/manual-demo.md", import.meta.url),
      "utf8",
    );
    expect(guide).toContain("api-003");
    expect(guide).toContain("No se versiona");
    expect(guide).toContain("al recargar la página");
    expect(guide).not.toContain("demo1234");
  });
});
