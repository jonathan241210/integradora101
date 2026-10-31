import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ApiError, AuthApi, StaffProfile } from "@arca/api-client";
import { LoginView } from "../views/LoginView";
import { TwoFactorChallengeView } from "../views/TwoFactorChallengeView";
import { TwoFactorSetupView } from "../views/TwoFactorSetupView";
import { PwaRedirectView } from "../views/PwaRedirectView";
import {
  acknowledgeRecoveryCodes,
  authSessionReducer,
  cancelTwoFactorSession,
  checkSession,
  confirmTwoFactorSetup,
  initialAuthSessionState,
  resolveStaffProfile,
  retryTwoFactorSetup,
  signOut,
  startTwoFactorSetup,
  submitTwoFactor,
  type AuthSessionAction,
  type AuthSessionDispatch,
} from "../viewmodels/auth-session";
import { getNavigationForProfile, getPresentationProfile } from "../viewmodels/navigation";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));

function staffProfile(overrides: Partial<StaffProfile> = {}): StaffProfile {
  return {
    id: 17,
    first_name: "Personal",
    last_name: "De prueba",
    second_last_name: null,
    full_name: "Personal De prueba",
    email: "personal@test.arca.invalid",
    department: { code: "test", name: "Área de prueba" },
    roles: ["executive"],
    permissions: ["dashboard.view", "reports.view"],
    home: "executive",
    pwa_url: null,
    two_factor_setup_required: false,
    ...overrides,
  };
}

function createAuthApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    login: vi.fn(async () => ({ twoFactor: false })),
    twoFactorChallenge: vi.fn(async () => undefined),
    me: vi.fn(async () => staffProfile()),
    logout: vi.fn(async () => undefined),
    enableTwoFactor: vi.fn(async () => undefined),
    twoFactorQrCode: vi.fn(async () => ({ svg: "<svg></svg>" })),
    confirmTwoFactor: vi.fn(async () => undefined),
    recoveryCodes: vi.fn(async () => ["recuperacion-1", "recuperacion-2"]),
    ...overrides,
  } as AuthApi;
}

function createSessionHarness() {
  let state = initialAuthSessionState;
  const dispatch: AuthSessionDispatch = (action: AuthSessionAction) => {
    state = authSessionReducer(state, action);
  };

  return {
    dispatch,
    get state() {
      return state;
    },
  };
}

function unauthorizedError(): ApiError {
  return Object.assign(new Error("Unauthenticated."), { status: 401 }) as ApiError;
}

describe("CA-01 real-staff-login", () => {
  it("presenta un solo formulario institucional sin selector ni credenciales demo", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error=""
        submitting={false}
        sessionExpired={false}
        onSubmit={() => undefined}
      />,
    );

    expect(markup.match(/<form/g)).toHaveLength(1);
    expect(markup).toContain('type="email"');
    expect(markup).toContain("Correo institucional");
    expect(markup).toContain("Contraseña");
    expect(markup).not.toContain("Selecciona un perfil");
    expect(markup).not.toContain("administrador@demo.local");
    expect(markup).not.toContain("taquilla@demo.local");
    expect(markup).not.toContain("demo1234");
    expect(markup).not.toContain("demo-banner");
  });
});

describe("CA-02 real-staff-login", () => {
  it("ofrece un control de mostrar y ocultar contraseña con estado accesible", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error=""
        submitting={false}
        sessionExpired={false}
        onSubmit={() => undefined}
      />,
    );
    const source = readFileSync(new URL("../views/LoginView.tsx", import.meta.url), "utf8");

    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Mostrar contraseña"');
    expect(markup).toContain('type="password"');
    expect(source).toContain('type={passwordVisible ? "text" : "password"}');
    expect(source).toContain("setPasswordVisible((visible) => !visible)");
    expect(source).toContain('aria-label={passwordVisible ? "Ocultar contraseña" : "Mostrar contraseña"}');
  });
});

describe("CA-03 real-staff-login", () => {
  it("presenta los errores 422 y 429 en una alerta accesible", () => {
    const genericError = renderToStaticMarkup(
      <LoginView
        error="Correo o contraseña incorrectos."
        submitting={false}
        sessionExpired={false}
        onSubmit={() => undefined}
      />,
    );
    const throttledError = renderToStaticMarkup(
      <LoginView
        error="Demasiados intentos. Intenta de nuevo en 18 segundos."
        submitting={false}
        sessionExpired={false}
        onSubmit={() => undefined}
      />,
    );

    expect(genericError).toContain('role="alert"');
    expect(genericError).toContain("Correo o contraseña incorrectos.");
    expect(throttledError).toContain('role="alert"');
    expect(throttledError).toContain("18 segundos");
  });
});

describe("CA-04 real-staff-login", () => {
  it("acepta retos TOTP y de recuperación y consulta el perfil tras completarlos", async () => {
    for (const challenge of [{ code: "123456" }, { recovery_code: "recuperacion-1" }]) {
      const harness = createSessionHarness();
      const authApi = createAuthApi();
      harness.dispatch({ type: "two-factor-required" });

      await submitTwoFactor(authApi, harness.dispatch, () => undefined, challenge);

      expect(authApi.twoFactorChallenge).toHaveBeenCalledWith(challenge);
      expect(authApi.me).toHaveBeenCalledOnce();
      expect(harness.state.status).toBe("authenticated");
    }
  });

  it("muestra una vista de reto que permite alternar entre código TOTP y recuperación", () => {
    const markup = renderToStaticMarkup(
      <TwoFactorChallengeView
        error="Código inválido."
        submitting={false}
        onSubmit={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("Código de autenticación");
    expect(markup).toContain("Usar código de recuperación");
    expect(markup).toContain('role="alert"');
  });

  it("permite volver al login sin llamar logout", () => {
    const harness = createSessionHarness();
    const authApi = createAuthApi();
    harness.dispatch({ type: "two-factor-required" });

    const markup = renderToStaticMarkup(
      <TwoFactorChallengeView
        error=""
        submitting={false}
        onSubmit={() => undefined}
        onCancel={() => cancelTwoFactorSession(harness.dispatch)}
      />,
    );
    cancelTwoFactorSession(harness.dispatch);

    expect(markup).toContain("Volver al inicio de sesión");
    expect(harness.state.status).toBe("anonymous");
    expect(authApi.logout).not.toHaveBeenCalled();
  });
});

describe("CA-05 real-staff-login", () => {
  it("enrola a admin y zoo-admin, obtiene QR, recuperaciones y vuelve a consultar me", async () => {
    for (const role of ["admin", "zoo-admin"]) {
      const harness = createSessionHarness();
      const initialProfile = staffProfile({
        roles: [role],
        home: "administration",
        two_factor_setup_required: true,
      });
      const authenticatedProfile = staffProfile({
        roles: [role],
        home: "administration",
        two_factor_setup_required: false,
      });
      const authApi = createAuthApi({ me: vi.fn(async () => authenticatedProfile) });
      await resolveStaffProfile(initialProfile, authApi, harness.dispatch, () => undefined);

      expect(authApi.enableTwoFactor).toHaveBeenCalledOnce();
      expect(authApi.twoFactorQrCode).toHaveBeenCalledOnce();
      expect(harness.state.status).toBe("two-factor-setup");
      expect(harness.state.qrSvg).toBe("<svg></svg>");

      await confirmTwoFactorSetup(authApi, harness.dispatch, "123456");
      expect(authApi.confirmTwoFactor).toHaveBeenCalledWith("123456");
      expect(authApi.recoveryCodes).toHaveBeenCalledOnce();
      expect(harness.state.recoveryCodes).toEqual(["recuperacion-1", "recuperacion-2"]);

      const markup = renderToStaticMarkup(
        <TwoFactorSetupView
          qrSvg={harness.state.qrSvg}
          recoveryCodes={harness.state.recoveryCodes}
          error=""
          submitting={false}
          onConfirm={() => undefined}
          onAcknowledge={() => undefined}
          onRetry={() => undefined}
        />,
      );
      expect(markup).toContain('alt="Código QR para tu app autenticadora"');
      expect(markup).toContain("data:image/svg+xml;utf8,%3Csvg%3E%3C%2Fsvg%3E");
      expect(markup).toContain("recuperacion-1");
      expect(markup).toContain("Ya guardé mis códigos");

      await acknowledgeRecoveryCodes(authApi, harness.dispatch, () => undefined);
      expect(authApi.me).toHaveBeenCalledOnce();
      expect(harness.state.recoveryCodes).toEqual([]);
      expect(harness.state.status).toBe("authenticated");
    }
  });

  it("muestra Reintentar y vuelve a cargar el QR después de un error", async () => {
    const harness = createSessionHarness();
    const profile = staffProfile({
      roles: ["admin"],
      home: "administration",
      two_factor_setup_required: true,
    });
    const authApi = createAuthApi({
      twoFactorQrCode: vi.fn()
        .mockRejectedValueOnce(new Error("No se pudo cargar el QR."))
        .mockResolvedValueOnce({ svg: "<svg>renovado</svg>" }),
    });

    await resolveStaffProfile(profile, authApi, harness.dispatch, () => undefined);

    expect(harness.state.qrSvg).toBeNull();
    expect(harness.state.error).toBe("No se pudo cargar el QR.");
    const markup = renderToStaticMarkup(
      <TwoFactorSetupView
        qrSvg={harness.state.qrSvg}
        recoveryCodes={[]}
        error={harness.state.error}
        submitting={harness.state.submitting}
        onConfirm={() => undefined}
        onAcknowledge={() => undefined}
        onRetry={() => undefined}
      />,
    );
    expect(markup).toContain("Reintentar");

    await retryTwoFactorSetup(authApi, harness.dispatch, profile);

    expect(authApi.enableTwoFactor).toHaveBeenCalledTimes(2);
    expect(authApi.twoFactorQrCode).toHaveBeenCalledTimes(2);
    expect(harness.state.status).toBe("two-factor-setup");
    expect(harness.state.qrSvg).toBe("<svg>renovado</svg>");
    expect(harness.state.error).toBe("");
  });
});

describe("CA-06 real-staff-login", () => {
  it("filtra navegación administrativa, ejecutiva y de taquilla por permisos", async () => {
    const adminPermissions = [
      "dashboard.view",
      "news.manage",
      "events.manage",
      "reports.view",
      "enclosures.manage",
      "users.manage",
      "operational-staff.manage",
    ];

    const profiles = [
      { role: "admin", permissions: adminPermissions },
      {
        role: "zoo-admin",
        permissions: [
          "dashboard.view",
          "news.manage",
          "events.manage",
          "reports.view",
          "enclosures.manage",
          "operational-staff.manage",
        ],
      },
    ];

    for (const { role, permissions } of profiles) {
      const admin = staffProfile({
        roles: [role],
        home: "administration",
        permissions,
      });
      const navigation = getNavigationForProfile(admin).map((item) => item.id);
      expect(navigation).toEqual([
        "dashboard",
        "news",
        "events",
        "reports",
        "enclosures",
        "ticket-users",
      ]);
      expect(getPresentationProfile(admin.home)).toBe("administration");
    }

    const executive = staffProfile({
      roles: ["executive"],
      home: "executive",
      permissions: ["dashboard.view", "reports.view"],
    });
    expect(getNavigationForProfile(executive).map((item) => item.id)).toEqual([
      "dashboard",
      "reports",
    ]);

    const cashier = staffProfile({
      roles: ["cashier"],
      home: "ticket",
      permissions: ["tickets.create", "tickets.view"],
    });
    expect(getNavigationForProfile(cashier).map((item) => item.id)).toEqual([
      "tickets",
      "ticket-history",
    ]);

    const missingRoleHarness = createSessionHarness();
    await resolveStaffProfile(
      staffProfile({ home: null, roles: [], permissions: [] }),
      createAuthApi(),
      missingRoleHarness.dispatch,
      () => undefined,
    );
    expect(missingRoleHarness.state.status).toBe("anonymous");
    expect(missingRoleHarness.state.error).toBe(
      "Tu cuenta no tiene un rol asignado. Contacta al administrador.",
    );
  });
});

describe("CA-07 real-staff-login", () => {
  it("redirige veterinaria solo cuando existe pwa_url y ofrece respaldo", async () => {
    const harness = createSessionHarness();
    const redirect = vi.fn();
    const veterinaryProfile = staffProfile({
      roles: ["veterinarian"],
      home: "pwa",
      pwa_url: "https://pwa.example.test",
      permissions: ["public-content.view"],
    });

    await resolveStaffProfile(veterinaryProfile, createAuthApi(), harness.dispatch, redirect);
    expect(harness.state.status).toBe("redirecting-pwa");
    expect(redirect).toHaveBeenCalledWith("https://pwa.example.test");

    const missingUrlHarness = createSessionHarness();
    const missingUrlRedirect = vi.fn();
    await resolveStaffProfile(
      { ...veterinaryProfile, pwa_url: null },
      createAuthApi(),
      missingUrlHarness.dispatch,
      missingUrlRedirect,
    );
    const markup = renderToStaticMarkup(<PwaRedirectView pwaUrl={null} />);
    expect(missingUrlRedirect).not.toHaveBeenCalled();
    expect(markup).toContain("no está configurada");
    expect(markup).not.toContain("<a");
  });
});

describe("CA-08 real-staff-login", () => {
  it("distingue el 401 inicial de una sesión vencida", async () => {
    const initialHarness = createSessionHarness();
    await checkSession(
      createAuthApi({ me: vi.fn(async () => Promise.reject(unauthorizedError())) }),
      initialHarness.dispatch,
      () => undefined,
    );
    expect(initialHarness.state.status).toBe("anonymous");
    expect(initialHarness.state.sessionExpired).toBe(false);
    expect(initialHarness.state.error).toBe("");

    const expiredHarness = createSessionHarness();
    expiredHarness.dispatch({ type: "two-factor-required" });
    const authApi = createAuthApi({
      twoFactorChallenge: vi.fn(async () => Promise.reject(unauthorizedError())),
    });
    await submitTwoFactor(authApi, expiredHarness.dispatch, () => undefined, { code: "123456" });

    expect(expiredHarness.state.status).toBe("anonymous");
    expect(expiredHarness.state.sessionExpired).toBe(true);
    expect(expiredHarness.state.error).toBe("Tu sesión expiró. Vuelve a iniciar sesión.");
  });
});

describe("CA-09 real-staff-login", () => {
  it("llama logout y limpia el estado de acceso", async () => {
    const harness = createSessionHarness();
    harness.dispatch({ type: "authenticated", profile: staffProfile() });
    const authApi = createAuthApi();

    await signOut(authApi, harness.dispatch);

    expect(authApi.logout).toHaveBeenCalledOnce();
    expect(harness.state.status).toBe("anonymous");
    expect(harness.state.profile).toBeNull();
  });
});

describe("CA-10 real-staff-login", () => {
  it("mantiene Usuarios de taquilla como muestra sin guardar credenciales de login", () => {
    const demoData = readFileSync(new URL("../data/demo-data.ts", import.meta.url), "utf8");
    const demoReducer = readFileSync(
      new URL("../viewmodels/dashboard-demo.ts", import.meta.url),
      "utf8",
    );
    const userView = readFileSync(
      new URL("../views/TicketUsersView.tsx", import.meta.url),
      "utf8",
    );

    expect(demoData).not.toContain("demoAdministrationCredentials");
    expect(demoData).not.toContain("password: \"demo1234\"");
    expect(demoReducer).not.toContain("login-administration");
    expect(demoReducer).not.toContain("login-ticket");
    expect(userView).toContain("Usuarios de taquilla");
    expect(userView).toContain("no habilita el inicio de sesión");
  });
});

describe("CA-11 real-staff-login", () => {
  it("mantiene HTTP fuera de App, views y components", () => {
    const sourcePaths = [
      "../App.tsx",
      ...readdirSync(fileURLToPath(new URL("../views", import.meta.url)))
        .filter((file) => file.endsWith(".tsx"))
        .map((file) => `../views/${file}`),
      ...readdirSync(fileURLToPath(new URL("../components", import.meta.url)))
        .filter((file) => file.endsWith(".tsx"))
        .map((file) => `../components/${file}`),
    ];
    const source = sourcePaths
      .map((path) => readFileSync(new URL(path, import.meta.url), "utf8"))
      .join("\n");

    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/\baxios\b/);
    expect(source).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("CA-12 real-staff-login", () => {
  it("mantiene etiquetas, alerta, foco y reglas responsive para los formularios", () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error="Correo o contraseña incorrectos."
        submitting={false}
        sessionExpired={false}
        onSubmit={() => undefined}
      />,
    );
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(markup).toContain('for="staff-email"');
    expect(markup).toContain('for="staff-password"');
    expect(markup).toContain('role="alert"');
    expect(styles).toContain(":focus-visible");
    expect(styles).toContain(".auth-page");
    expect(styles).toContain("@media (max-width: 560px)");
    expect(styles).not.toMatch(/\.auth-page\s*\{[^}]*min-width:/s);
  });
});

describe("CA-13 real-staff-login", () => {
  it("usa tokens semánticos sin hex de marca en las vistas nuevas", () => {
    const viewFiles = [
      "LoginView.tsx",
      "TwoFactorChallengeView.tsx",
      "TwoFactorSetupView.tsx",
      "PwaRedirectView.tsx",
    ];
    const views = viewFiles
      .map((file) => readFileSync(new URL(`../views/${file}`, import.meta.url), "utf8"))
      .join("\n");
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(views).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(styles).toContain("var(--primary)");
    expect(styles).toContain("var(--surface-page)");
  });
});
