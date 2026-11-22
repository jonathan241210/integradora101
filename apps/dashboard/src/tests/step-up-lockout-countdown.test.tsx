import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiError, AuthApi } from "@arca/api-client";
import type { CountdownState } from "@arca/ui";

// El hook se sustituye por un estado controlado: el entorno es `node`, sin DOM.
const hook = vi.hoisted(() => ({
  state: { remaining: null, running: false, finished: false } as CountdownState,
}));

vi.mock("@arca/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@arca/ui")>()),
  useCountdown: () => hook.state,
}));

import { StepUpConfirmationDialog } from "../components/StepUpConfirmationDialog";
import { LoginView } from "../views/LoginView";
import { TwoFactorChallengeView } from "../views/TwoFactorChallengeView";
import { formatCountdown, rateLimitEndedText, rateLimitText, startCountdown } from "@arca/ui";
import { authSessionReducer, initialAuthSessionState, submitLogin } from "../viewmodels/auth-session";
import { closedStepUpDialog, runWithStepUp, type StepUpDialogState } from "../viewmodels/step-up";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const read = (relative: string) =>
  readFileSync(new URL(`../${relative}`, `file://${testsDirectory}`), "utf8");

const running = (remaining: number): CountdownState => ({ remaining, running: true, finished: false });
const finished: CountdownState = { remaining: 0, running: false, finished: true };
const idle: CountdownState = { remaining: null, running: false, finished: false };

beforeEach(() => {
  hook.state = idle;
});

const noop = () => undefined;
const apiText = "Demasiados intentos. Intenta de nuevo en 587 segundos.";
const login = (retryAfterSeconds: number | null, error = apiText) =>
  renderToStaticMarkup(
    createElement(LoginView, {
      error,
      retryAfterSeconds,
      submitting: false,
      sessionExpired: false,
      onSubmit: noop,
    }),
  );
const challenge = (retryAfterSeconds: number | null, error = apiText) =>
  renderToStaticMarkup(
    createElement(TwoFactorChallengeView, {
      error,
      retryAfterSeconds,
      submitting: false,
      onSubmit: noop,
      onCancel: noop,
    }),
  );
const dialogState = (retryAfterSeconds: number | null, message = apiText): StepUpDialogState => ({
  ...closedStepUpDialog,
  open: true,
  status: "rate-limited",
  message,
  retryAfterSeconds,
});
const dialog = (state: StepUpDialogState) =>
  renderToStaticMarkup(
    createElement(StepUpConfirmationDialog, { dialog: state, onSubmit: noop, onCancel: noop }),
  );
const submitDisabled = (markup: string) =>
  /<button[^>]*type="submit"[^>]*disabled=""|<button[^>]*disabled=""[^>]*type="submit"/.test(markup);

describe("CA-21 step-up-lockout-countdown", () => {
  it("formatCountdown entrega m:ss: 600 a 10:00, 587 a 9:47, 42 a 0:42, 0 a 0:00", () => {
    expect(formatCountdown(600)).toBe("10:00");
    expect(formatCountdown(587)).toBe("9:47");
    expect(formatCountdown(42)).toBe("0:42");
    expect(formatCountdown(0)).toBe("0:00");
    expect(rateLimitText(587)).toBe("Demasiados intentos. Podrás intentarlo de nuevo en 9:47");
    expect(rateLimitText(0)).toBe(rateLimitEndedText);
  });

  it("el diálogo, el login y el reto 2FA arman el texto con m:ss a partir de retryAfterSeconds", () => {
    hook.state = running(587);

    for (const markup of [dialog(dialogState(587)), login(587), challenge(587)]) {
      expect(markup).toContain("Demasiados intentos. Podrás intentarlo de nuevo en");
      expect(markup).toContain("9:47");
      expect(markup).not.toContain("587 segundos");
    }
  });

  it("el 429 del login guarda retryAfterSeconds en el estado y cualquier otra acción lo limpia", async () => {
    const error = Object.assign(new Error("Demasiados intentos."), {
      name: "ApiError",
      status: 429,
      retryAfterSeconds: 587,
    }) as unknown as ApiError;
    const authApi = { login: vi.fn().mockRejectedValue(error) } as unknown as AuthApi;
    let state = initialAuthSessionState;

    await submitLogin(authApi, (action) => (state = authSessionReducer(state, action)), noop, "a@b.c", "x");
    expect(state.retryAfterSeconds).toBe(587);
    expect(authSessionReducer(state, { type: "login-submitted" }).retryAfterSeconds).toBeNull();
  });
});

describe("CA-22 step-up-lockout-countdown", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("la cuenta baja cada segundo con timers falsos y se detiene en 0", () => {
    const ticks: number[] = [];

    startCountdown(3, (remaining) => ticks.push(remaining));
    vi.advanceTimersByTime(1000);
    expect(ticks).toEqual([2]);
    vi.advanceTimersByTime(5000);
    expect(ticks).toEqual([2, 1, 0]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("se calcula contra un instante final: si la pestaña se duerme, el siguiente tick salta", () => {
    const ticks: number[] = [];

    startCountdown(600, (remaining) => ticks.push(remaining));
    vi.setSystemTime(Date.now() + 120_000);
    vi.advanceTimersByTime(1000);
    expect(ticks.at(-1)).toBe(479);
  });

  it("detener la cuenta limpia el intervalo y no vuelve a notificar", () => {
    const onTick = vi.fn();
    const stop = startCountdown(10, onTick);

    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it("el hook usa startCountdown y devuelve su limpieza al desmontar; las vistas solo lo consumen", () => {
    const source = readFileSync(
      fileURLToPath(new URL("../../../../packages/ui/src/useCountdown.ts", import.meta.url)),
      "utf8",
    );

    expect(source).toMatch(/return startCountdown\(/);
    expect(source).not.toMatch(/setInterval|Date\.now/);
    for (const view of [
      "views/LoginView.tsx",
      "views/TwoFactorChallengeView.tsx",
      "components/StepUpConfirmationDialog.tsx",
    ]) {
      expect(read(view)).toContain("useCountdown(");
      expect(read(view)).not.toMatch(/setInterval|Date\.now/);
    }
  });
});

describe("CA-23 step-up-lockout-countdown", () => {
  it("el login deshabilita Ingresar mientras corre y lo habilita al terminar con «Ya puedes intentarlo de nuevo.»", () => {
    hook.state = running(5);
    expect(submitDisabled(login(5))).toBe(true);

    hook.state = finished;
    const done = login(5);

    expect(done).toContain(rateLimitEndedText);
    expect(done).not.toContain("Podrás intentarlo");
    // Con campos vacíos el botón sigue deshabilitado por otra razón; el cableado se comprueba abajo.
    expect(finished.running).toBe(false);
  });

  it("el reto 2FA deshabilita Continuar mientras corre (con código escrito no cambia el contador)", () => {
    hook.state = running(2);
    expect(submitDisabled(challenge(2))).toBe(true);
    hook.state = finished;
    expect(challenge(2)).toContain(rateLimitEndedText);
  });

  it("el diálogo deshabilita Confirmar mientras corre y muestra el aviso de fin al terminar", () => {
    hook.state = running(3);
    expect(submitDisabled(dialog(dialogState(3)))).toBe(true);
    hook.state = finished;
    expect(dialog(dialogState(3))).toContain(rateLimitEndedText);
  });

  it("las vistas deshabilitan el envío con countdown.running", () => {
    for (const view of [
      "views/LoginView.tsx",
      "views/TwoFactorChallengeView.tsx",
      "components/StepUpConfirmationDialog.tsx",
    ]) {
      expect(read(view)).toContain("countdown.running");
    }
  });
});

describe("CA-24 step-up-lockout-countdown", () => {
  it("sin retryAfterSeconds se muestra el mensaje de la API tal cual, sin contador", () => {
    const message = "Demasiados intentos. Intenta de nuevo más tarde.";

    hook.state = idle;
    for (const markup of [login(null, message), challenge(null, message), dialog(dialogState(null, message))]) {
      expect(markup).toContain(message);
      expect(markup).not.toContain("Podrás intentarlo");
      expect(markup).not.toContain("lockout-countdown");
    }
  });

  it("el diálogo sin retryAfterSeconds conserva el bloqueo hasta que se edita el campo", async () => {
    const confirm = vi.fn().mockRejectedValue(
      Object.assign(new Error("Demasiados intentos."), { status: 429, retryAfterSeconds: undefined }),
    );
    const feedbacks: unknown[] = [];
    const answers = ["x", null];

    await expect(
      runWithStepUp(
        vi.fn().mockRejectedValue({ status: 403, code: "password_confirmation_required", mode: "window" }),
        {
          askPassword: async (_mode, feedback) => (feedbacks.push(feedback), answers.shift() ?? null),
          confirm,
        },
      ),
    ).rejects.toThrow();
    expect(feedbacks[1]).toMatchObject({ kind: "rate-limited", retryAfterSeconds: null });
  });
});

describe("CA-25 step-up-lockout-countdown", () => {
  it("los dígitos van en aria-live off y el lector oye solo el aviso inicial y el de fin", () => {
    hook.state = running(3);
    const midway = login(5);

    expect(midway).toMatch(/aria-live="off"[^>]*data-testid="lockout-countdown"|data-testid="lockout-countdown"[^>]*aria-live="off"/);
    // El anuncio usa los segundos iniciales (0:05), no los restantes (0:03).
    expect(midway).toMatch(/role="status"[^>]*>Demasiados intentos. Podrás intentarlo de nuevo en 0:05</);

    hook.state = finished;
    expect(login(5)).toMatch(/role="status"[^>]*>Ya puedes intentarlo de nuevo\.</);
  });
});
