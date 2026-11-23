import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AuthApi, StaffProfile } from "@arca/api-client";
import { createHttpClient } from "@arca/api-client";
import { TwoFactorChallengeView } from "../views/TwoFactorChallengeView";
import { PwaRedirectView } from "../views/PwaRedirectView";
import { TwoFactorSetupView } from "../views/TwoFactorSetupView";
import {
  authSessionReducer,
  cashierTwoFactorNotice,
  handleTwoFactorSetupRequired,
  initialAuthSessionState,
  resolveStaffProfile,
  signOut,
  submitLogin,
  twoFactorSetupNotice,
  type AuthSessionAction,
  type AuthSessionState,
} from "../viewmodels/auth-session";
import { getNavigationForProfile } from "../viewmodels/navigation";
import { createStepUpController, StepUpCancelledError, type StepUpDialogState } from "../viewmodels/step-up";
import { apiError } from "./admin-fixtures";

const srcDirectory = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string) => readFileSync(`${srcDirectory}${path}`, "utf8");

function cashier(overrides: Partial<StaffProfile> = {}): StaffProfile {
  return {
    id: 21,
    first_name: "Caja",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Caja Prueba",
    email: "caja@test.arca.invalid",
    department: { code: "ticketing", name: "Taquilla" },
    roles: ["cashier"],
    permissions: ["tickets.create", "tickets.view", "tickets.cancel"],
    home: "ticket",
    pwa_url: null,
    two_factor_setup_required: false,
    ...overrides,
  } as StaffProfile;
}

function authApi(overrides: Partial<AuthApi> = {}): AuthApi {
  return {
    login: vi.fn(async () => ({ twoFactor: false })),
    twoFactorChallenge: vi.fn(async () => undefined),
    me: vi.fn(async () => cashier()),
    logout: vi.fn(async () => undefined),
    enableTwoFactor: vi.fn(async () => undefined),
    twoFactorQrCode: vi.fn(async () => ({ svg: "<svg></svg>" })),
    confirmTwoFactor: vi.fn(async () => undefined),
    recoveryCodes: vi.fn(async () => ["recuperacion-1"]),
    ...overrides,
  } as AuthApi;
}

function session(initial: AuthSessionState = initialAuthSessionState) {
  let state = initial;
  const actions: AuthSessionAction[] = [];

  return {
    dispatch: (action: AuthSessionAction) => {
      actions.push(action);
      state = authSessionReducer(state, action);
    },
    actions,
    get state() {
      return state;
    },
  };
}

const setupView = (notice?: string) =>
  renderToStaticMarkup(
    <TwoFactorSetupView
      qrSvg="<svg></svg>"
      recoveryCodes={[]}
      error=""
      submitting={false}
      onConfirm={vi.fn()}
      onAcknowledge={vi.fn()}
      onRetry={vi.fn()}
      onSignOut={vi.fn()}
      notice={notice}
    />,
  );

describe("CA-09 step-up-two-factor", () => {
  it("el cliente HTTP avisa el 403 two_factor_setup_required sin afectar a otros 403", async () => {
    const onSetup = vi.fn();
    const respond = (code: string) =>
      new Response(JSON.stringify({ message: "Configura tu segundo factor.", code }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    let code = "two_factor_setup_required";
    const http = createHttpClient({
      baseUrl: "",
      fetchImpl: async () => respond(code),
      onTwoFactorSetupRequired: onSetup,
    });

    await expect(http.get("/api/v1/admin/tickets")).rejects.toMatchObject({ status: 403 });
    expect(onSetup).toHaveBeenCalledTimes(1);
    code = "password_confirmation_required";
    await expect(http.get("/api/v1/admin/tickets")).rejects.toMatchObject({ status: 403 });
    expect(onSetup).toHaveBeenCalledTimes(1);
  });

  it("en una sesión iniciada, el 403 lleva al enrolamiento y la navegación de Venta e Historial ya no se muestra", async () => {
    const api = authApi({ me: vi.fn(async () => cashier({ two_factor_setup_required: true })) });
    const h = session({ ...initialAuthSessionState, status: "authenticated", profile: cashier() });

    await handleTwoFactorSetupRequired(api, h.dispatch);

    expect(h.state.status).toBe("two-factor-setup");
    expect(h.state.qrSvg).toBe("<svg></svg>");
    expect(api.enableTwoFactor).toHaveBeenCalledTimes(1);
    expect(setupView()).toContain("Configura tu segundo factor");
    expect(setupView()).not.toContain("Venta de boletos");
    expect(setupView()).not.toContain("Historial");
  });

  it("si la API ya no exige el 2FA no cambia de pantalla", async () => {
    const api = authApi();
    const h = session({ ...initialAuthSessionState, status: "authenticated", profile: cashier() });

    await handleTwoFactorSetupRequired(api, h.dispatch);

    expect(h.state.status).toBe("authenticated");
  });

  it("useAuthSession registra el manejador del 403 y solo actúa con la sesión iniciada", () => {
    const hook = read("viewmodels/useAuthSession.ts");

    expect(hook).toContain("setTwoFactorSetupHandler");
    expect(hook).toContain('stateRef.current.status === "authenticated"');
    expect(read("services/arca-api.ts")).toContain("onTwoFactorSetupRequired");
  });
});

describe("CA-10 step-up-two-factor", () => {
  it("un cajero sin 2FA ve el aviso exacto, el QR y la confirmación, y no ve Venta", async () => {
    const h = session();
    const profile = cashier({ two_factor_setup_required: true });
    const api = authApi({ me: vi.fn(async () => profile) });

    await resolveStaffProfile(profile, api, h.dispatch, vi.fn());

    expect(h.state.status).toBe("two-factor-setup");
    expect(h.state.profile?.roles).toContain("cashier");
    const notice = twoFactorSetupNotice(h.state.profile);
    const markup = setupView(notice);

    expect(notice).toBe(
      "Para vender boletos y consultar tu historial, configura tu segundo factor de autenticación. Necesitas una app autenticadora en tu celular.",
    );
    expect(markup).toContain("Configura tu segundo factor");
    expect(markup).toContain(cashierTwoFactorNotice);
    expect(markup).toContain("Código QR para tu app autenticadora");
    expect(markup).toContain('id="two-factor-confirmation-code"');
    expect(markup).not.toContain("Venta de boletos");
    expect(getNavigationForProfile(profile).some((item) => item.id === "tickets")).toBe(true);
  });

  it("otros roles no reciben el aviso del cajero y sin prop la vista no lo muestra", () => {
    expect(twoFactorSetupNotice(cashier({ roles: ["executive"] }))).toBeUndefined();
    expect(twoFactorSetupNotice(null)).toBeUndefined();
    expect(setupView()).not.toContain("Para vender boletos");
  });
});

describe("CA-11 step-up-two-factor", () => {
  it("un cajero con 2FA confirmado recibe el reto y no el aviso", async () => {
    const h = session();
    const api = authApi({ login: vi.fn(async () => ({ twoFactor: true })) });

    await submitLogin(api, h.dispatch, vi.fn(), "caja@test.arca.invalid", "ficticia");

    expect(h.state.status).toBe("two-factor-challenge");
    expect(h.state.profile).toBeNull();
    expect(twoFactorSetupNotice(h.state.profile)).toBeUndefined();
    const markup = renderToStaticMarkup(
      <TwoFactorChallengeView error="" submitting={false} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(markup).not.toContain("Para vender boletos");
  });

  it("con el 2FA ya confirmado el perfil entra a la taquilla sin pasar por el enrolamiento", async () => {
    const h = session();
    const api = authApi();

    await resolveStaffProfile(cashier(), api, h.dispatch, vi.fn());

    expect(h.state.status).toBe("authenticated");
    expect(api.enableTwoFactor).not.toHaveBeenCalled();
  });
});

describe("CA-14 step-up-two-factor", () => {
  it("el proveedor se monta con la clave del perfil: cada sesión empieza sin confirmación previa", () => {
    const app = read("App.tsx");

    expect(app).toMatch(/<DashboardNotifications key=\{profile\.id\}>\s*<StepUpProvider>/);
  });

  it("al desmontar se cancela el diálogo pendiente y un controlador nuevo vuelve a pedir contraseña", async () => {
    const states: StepUpDialogState[] = [];
    const first = createStepUpController(async () => ({}), (dialog) => states.push(dialog));
    const stepUp = Object.assign(apiError(403, "Confirma tu contraseña para realizar esta acción."), {
      code: "password_confirmation_required",
      mode: "window",
    });
    const pending = first.runProtected(async () => {
      throw stepUp;
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(states.at(-1)?.open).toBe(true);
    first.dispose();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
    expect(states.at(-1)?.open).toBe(false);

    const second: StepUpDialogState[] = [];
    const again = createStepUpController(async () => ({}), (dialog) => second.push(dialog));
    const operation = vi
      .fn()
      .mockRejectedValueOnce(stepUp)
      .mockResolvedValueOnce("ok");
    const run = again.runProtected(operation);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(second.at(-1)?.open).toBe(true);
    again.submit("ficticia");
    await expect(run).resolves.toBe("ok");
  });
});

const signOutLabel = "Cerrar sesión y volver al inicio";
const recoveryView = () =>
  renderToStaticMarkup(
    <TwoFactorSetupView
      qrSvg="<svg></svg>"
      recoveryCodes={["abc-123"]}
      error=""
      submitting={false}
      onConfirm={vi.fn()}
      onAcknowledge={vi.fn()}
      onRetry={vi.fn()}
      onSignOut={vi.fn()}
    />,
  );

describe("CA-18 step-up-two-factor (revisión 2026-11-20)", () => {
  it("el botón aparece en el paso del QR y del código, y no en el de códigos de recuperación", () => {
    expect(setupView()).toContain(signOutLabel);
    const recovery = recoveryView();
    expect(recovery).toContain("Ya guardé mis códigos");
    expect(recovery).not.toContain(signOutLabel);
  });

  it("está desactivado mientras se cierra la sesión", () => {
    const markup = renderToStaticMarkup(
      <TwoFactorSetupView
        qrSvg="<svg></svg>"
        recoveryCodes={[]}
        error=""
        submitting
        onConfirm={vi.fn()}
        onAcknowledge={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    expect(markup).toMatch(/<button[^>]*disabled[^>]*>Cerrar sesión y volver al inicio/);
  });

  it("llama al logout real de la sesión y deja al usuario anónimo", async () => {
    const h = session();
    const api = authApi({ logout: vi.fn(async () => undefined) });

    await signOut(api, h.dispatch);

    expect(api.logout).toHaveBeenCalledTimes(1);
    expect(h.state.status).toBe("anonymous");
    expect(read("App.tsx")).toMatch(/onSignOut=\{session\.logout\}[\s\S]*notice=/);
    expect(read("views/TwoFactorSetupView.tsx")).toContain("onClick={onSignOut}");
  });
});

describe("CA-19 step-up-two-factor (revisión 2026-11-20)", () => {
  it("PwaRedirectView muestra el botón, lo desactiva al cerrar y llama al callback", () => {
    expect(renderToStaticMarkup(<PwaRedirectView pwaUrl="https://pwa.test" onSignOut={vi.fn()} />)).toContain(signOutLabel);
    expect(renderToStaticMarkup(<PwaRedirectView pwaUrl={null} submitting onSignOut={vi.fn()} />)).toMatch(
      /<button[^>]*disabled[^>]*>Cerrar sesión y volver al inicio/,
    );

    const onSignOut = vi.fn();
    const tree = PwaRedirectView({ pwaUrl: null, onSignOut }) as unknown as { props: unknown };
    const find = (node: unknown): (() => void) | undefined => {
      if (!node || typeof node !== "object") return undefined;
      const el = node as { props?: { onClick?: () => void; children?: unknown } };
      if (el.props?.onClick) return el.props.onClick;
      for (const child of [el.props?.children].flat()) {
        const found = find(child);
        if (found) return found;
      }
      return undefined;
    };
    find(tree)?.();
    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(read("App.tsx")).toMatch(/<PwaRedirectView[\s\S]*onSignOut=\{session\.logout\}/);
  });
});

describe("CA-20 step-up-two-factor (revisión 2026-11-20)", () => {
  it("si el logout falla, PwaRedirectView y el paso del QR muestran el error y la sesión no se limpia", async () => {
    const h = session({ ...initialAuthSessionState, status: "redirecting-pwa" });
    const api = authApi({ logout: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) });
    await signOut(api, h.dispatch);
    expect(h.state.status).toBe("redirecting-pwa");
    expect(h.state.error).not.toBe("");

    const pwa = renderToStaticMarkup(
      <PwaRedirectView pwaUrl={null} error={h.state.error} onSignOut={vi.fn()} />,
    );
    expect(h.state.error).toBe(
      "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
    expect(pwa).toContain("No fue posible conectar con el servidor.");
    expect(pwa).not.toMatch(/<button[^>]*disabled/);
    expect(renderToStaticMarkup(<PwaRedirectView pwaUrl={null} onSignOut={vi.fn()} />)).not.toContain("No fue posible conectar");

    const qrHandle = session({ ...initialAuthSessionState, status: "two-factor-setup", qrSvg: "<svg></svg>" });
    await signOut(authApi({ logout: vi.fn(async () => { throw new TypeError("Failed to fetch"); }) }), qrHandle.dispatch);
    expect(qrHandle.state.status).toBe("two-factor-setup");

    const setup = renderToStaticMarkup(
      <TwoFactorSetupView
        qrSvg="<svg></svg>"
        recoveryCodes={[]}
        error={qrHandle.state.error}
        submitting={false}
        onConfirm={vi.fn()}
        onAcknowledge={vi.fn()}
        onRetry={vi.fn()}
        onSignOut={vi.fn()}
      />,
    );
    expect(setup).toContain("No fue posible conectar con el servidor.");
    expect(setup).not.toContain("Failed to fetch");
    expect(read("App.tsx")).toMatch(/<PwaRedirectView[\s\S]*error=\{session\.state\.error\}/);
  });
});
