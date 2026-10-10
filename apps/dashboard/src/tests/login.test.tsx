import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LoginView } from "../views/LoginView";
import {
  dashboardDemoReducer,
  getSectionsForProfile,
  initialDashboardDemoState,
} from "../viewmodels/dashboard-demo";

describe("CA-01 admin-dashboard-prototype", () => {
  it("permite elegir Administración o Taquilla sin enviar credenciales", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        selectedProfile={null}
        error=""
        onSelectProfile={() => undefined}
        onLoginAdministration={() => undefined}
        onLoginTicket={() => undefined}
      />,
    );

    expect(markup).toContain("Administración");
    expect(markup).toContain("Taquilla");
    expect(markup).toContain("No autentica ni protege información");
    expect(markup).not.toContain("<form");
  });

  it("muestra acceso y credenciales ficticias al elegir Taquilla", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        selectedProfile="ticket"
        error=""
        onSelectProfile={() => undefined}
        onLoginAdministration={() => undefined}
        onLoginTicket={() => undefined}
      />,
    );

    expect(markup).toContain("Ingresar a taquilla");
    expect(markup).toContain("taquilla@demo.local");
    expect(markup).toContain("demo1234");
    expect(markup).toContain('type="password"');
  });
});

describe("CA-10 admin-dashboard-prototype", () => {
  it("limita las secciones visibles del perfil de taquilla", () => {
    const selected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "select-profile",
      profile: "ticket",
    });
    const state = dashboardDemoReducer(selected, {
      type: "login-ticket",
      username: "taquilla@demo.local",
      password: "demo1234",
    });

    expect(state.activeProfile).toBe("ticket");
    expect(getSectionsForProfile("ticket")).toEqual(["tickets", "ticket-history"]);
    expect(getSectionsForProfile("administration")).not.toContain("tickets");
  });

  it("rechaza credenciales incorrectas y permite la cuenta ficticia", () => {
    const selected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "select-profile",
      profile: "ticket",
    });
    const rejected = dashboardDemoReducer(selected, {
      type: "login-ticket",
      username: "incorrecto",
      password: "incorrecta",
    });
    const accepted = dashboardDemoReducer(selected, {
      type: "login-ticket",
      username: "taquilla@demo.local",
      password: "demo1234",
    });

    expect(rejected.activeProfile).toBeNull();
    expect(rejected.notice).toContain("no son correctos");
    expect(accepted.activeProfile).toBe("ticket");
    expect(accepted.activeSection).toBe("tickets");
  });

  it("cierra la sesión visual sin borrar las cuentas temporales", () => {
    const selected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "select-profile",
      profile: "ticket",
    });
    const signedIn = dashboardDemoReducer(selected, {
      type: "login-ticket",
      username: "taquilla@demo.local",
      password: "demo1234",
    });
    const signedOut = dashboardDemoReducer(signedIn, { type: "sign-out" });

    expect(signedOut.activeProfile).toBeNull();
    expect(signedOut.selectedProfile).toBeNull();
    expect(signedOut.ticketUsers).toEqual(signedIn.ticketUsers);
    expect(getSectionsForProfile("ticket")).toEqual(["tickets", "ticket-history"]);
  });
});

describe("CA-13 admin-dashboard-prototype", () => {
  it("muestra el login administrativo y sus credenciales de demostración", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        selectedProfile="administration"
        error=""
        onSelectProfile={() => undefined}
        onLoginAdministration={() => undefined}
        onLoginTicket={() => undefined}
      />,
    );

    expect(markup).toContain("Ingreso de administración");
    expect(markup).toContain("administrador@demo.local");
    expect(markup).toContain("Ingresar a administración");
    expect(markup).toContain('id="administration-password"');
    expect(markup).toContain('type="password"');
  });

  it("rechaza credenciales incorrectas y permite el acceso de muestra", () => {
    const selected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "select-profile",
      profile: "administration",
    });
    const rejected = dashboardDemoReducer(selected, {
      type: "login-administration",
      username: "incorrecto",
      password: "incorrecta",
    });
    const accepted = dashboardDemoReducer(selected, {
      type: "login-administration",
      username: "ADMINISTRADOR@DEMO.LOCAL",
      password: "demo1234",
    });

    expect(rejected.activeProfile).toBeNull();
    expect(rejected.notice).toContain("no son correctos");
    expect(accepted.activeProfile).toBe("administration");
    expect(accepted.activeSection).toBe("dashboard");
  });

  it("anuncia el error administrativo con un alert accesible", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        selectedProfile="administration"
        error="El usuario o la contraseña no son correctos."
        onSelectProfile={() => undefined}
        onLoginAdministration={() => undefined}
        onLoginTicket={() => undefined}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("El usuario o la contraseña no son correctos.");
  });

  it("no inicia sesión administrativa si no se eligió ese perfil", () => {
    const rejected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "login-administration",
      username: "administrador@demo.local",
      password: "demo1234",
    });

    expect(rejected.activeProfile).toBeNull();
  });

  it("cierra la sesión administrativa de demostración", () => {
    const selected = dashboardDemoReducer(initialDashboardDemoState, {
      type: "select-profile",
      profile: "administration",
    });
    const signedIn = dashboardDemoReducer(selected, {
      type: "login-administration",
      username: "administrador@demo.local",
      password: "demo1234",
    });
    const signedOut = dashboardDemoReducer(signedIn, { type: "sign-out" });

    expect(signedOut.activeProfile).toBeNull();
    expect(signedOut.selectedProfile).toBeNull();
  });
});
