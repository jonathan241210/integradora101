import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createAdminApi, createHttpClient, createTicketSalesApi } from "@arca/api-client";
import { StepUpConfirmationDialog } from "../components/StepUpConfirmationDialog";
import {
  closedStepUpDialog,
  createStepUpController,
  isStepUpCancelled,
  readPasswordConfirmationRequirement,
  runUnprotected,
  runWithStepUp,
  StepUpCancelledError,
  type StepUpDialogState,
} from "../viewmodels/step-up";
import { describeApiError } from "../viewmodels/api-errors";
import {
  confirmStaffAction,
  initialStaffState,
  saveStaffAccount,
  staffAccountsReducer,
  type StaffAction,
  type StaffState,
} from "../viewmodels/staff-accounts";
import {
  cancelTicket,
  initialTicketHistoryState,
  ticketHistoryReducer,
} from "../viewmodels/ticket-history";
import {
  initialTicketPricesState,
  submitPriceChange,
  ticketPricesReducer,
} from "../viewmodels/ticket-prices";
import { regenerateEnclosureQr, type EnclosureQrAction } from "../viewmodels/enclosure-qr";
import { apiError, createAdminApiMock, createHarness, staffAccount } from "./admin-fixtures";
import { cancelInput, createTicketSalesApiMock, historyRow } from "./ticket-sales-fixtures";

const testsDirectory = fileURLToPath(new URL(".", import.meta.url));
const srcDirectory = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string) => readFileSync(`${srcDirectory}${path}`, "utf8");

// Contraseñas ficticias: no son credenciales reales.
const typed = "Clave-ficticia-1";
const adminTyped = "Admin-ficticia-2";

function stepUpError(mode: "window" | "always" | string = "window") {
  return Object.assign(apiError(403, "Confirma tu contraseña para realizar esta acción."), {
    code: "password_confirmation_required",
    mode,
  });
}

function rateLimitError(seconds = 30) {
  return Object.assign(
    apiError(429, `Demasiados intentos. Intenta de nuevo en ${seconds} segundos.`),
    { retryAfterSeconds: seconds },
  );
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function controllerHarness(confirm: (password: string) => Promise<unknown> = async () => ({})) {
  const states: StepUpDialogState[] = [];
  const controller = createStepUpController(confirm, (dialog) => states.push(dialog));

  return {
    controller,
    states,
    get last() {
      return states[states.length - 1] ?? closedStepUpDialog;
    },
  };
}

function renderDialog(dialog: Partial<StepUpDialogState> = {}) {
  return renderToStaticMarkup(
    <StepUpConfirmationDialog
      dialog={{ ...closedStepUpDialog, open: true, ...dialog }}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
}

describe("CA-01 step-up-confirmation", () => {
  it("un 403 window abre el diálogo con el campo de contraseña, sin ejecutar ni mostrar error genérico", async () => {
    const h = controllerHarness();
    const operation = vi.fn(async (..._args: unknown[]) => {
      if (operation.mock.calls.length === 1) throw stepUpError("window");

      return "hecho";
    });
    const pending = h.controller.runProtected(operation);

    await flush();

    expect(h.last.open).toBe(true);
    expect(h.last.mode).toBe("window");
    expect(h.last.message).toBe("");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(renderDialog({ mode: "window" })).toContain('id="step-up-password"');
    expect(readPasswordConfirmationRequirement(stepUpError("window"))).toEqual({ mode: "window" });

    h.controller.cancel();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
  });

  it("cancelar un boleto del historial abre el diálogo y no cancela todavía", async () => {
    const h = controllerHarness();
    const api = createTicketSalesApiMock();
    api.history.cancel.mockRejectedValueOnce(stepUpError("window"));
    const history = createHarness(ticketHistoryReducer, initialTicketHistoryState);
    const target = historyRow();

    history.dispatch({ type: "cancel-opened", target });
    const result = cancelTicket(
      api, history.dispatch, target, cancelInput("Error de captura"), history.state.query, () => true,
      h.controller.runProtected,
    );

    await flush();
    expect(h.last.open).toBe(true);
    expect(history.state.cancel.error).toBe("");
    h.controller.cancel();
    await result;
  });

  it("un modo desconocido no abre el diálogo y se trata como error común", () => {
    expect(readPasswordConfirmationRequirement(stepUpError("otro"))).toBeNull();
    expect(readPasswordConfirmationRequirement(apiError(403, "No autorizado"))).toBeNull();
    expect(describeApiError(stepUpError("always")).mode).toBe("always");
  });
});

describe("CA-02 step-up-confirmation", () => {
  it("confirma con la contraseña, cierra el diálogo y reintenta la operación una sola vez", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({ confirmed_until: "2026-11-20T17:00:00Z" }));
    const h = controllerHarness(confirm);
    const api = createTicketSalesApiMock();
    api.history.cancel
      .mockRejectedValueOnce(stepUpError("window"))
      .mockResolvedValueOnce(historyRow({ status: "cancelled", cancellable: false }));
    const history = createHarness(ticketHistoryReducer, initialTicketHistoryState);
    const target = historyRow();

    history.dispatch({ type: "cancel-opened", target });
    const result = cancelTicket(
      api, history.dispatch, target, cancelInput("Error de captura"), history.state.query, () => true,
      h.controller.runProtected,
    );

    await flush();
    h.controller.submit(typed);

    expect(await result).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith(typed);
    expect(api.history.cancel).toHaveBeenCalledTimes(2);
    expect(api.history.cancel).toHaveBeenLastCalledWith(7, { reason_code: "capture_error", reason: "Error de captura" });
    expect(h.last.open).toBe(false);
  });

  it("si el reintento vuelve a responder 403, el diálogo se reabre sin reintentos extra", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (..._args: unknown[]) => {
      if (operation.mock.calls.length <= 2) throw stepUpError("window");

      return "ok";
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit(typed);
    await flush();

    expect(operation).toHaveBeenCalledTimes(2);
    expect(h.last.open).toBe(true);
    h.controller.submit(typed);
    await expect(pending).resolves.toBe("ok");
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("api-client: passwordConfirmation.confirm llama POST admin/password-confirmation y desenvuelve data", async () => {
    const http = {
      post: vi.fn(async () => ({ data: { confirmed_until: "2026-11-20T17:00:00Z" } })),
    };
    const api = createAdminApi(http as never);

    await expect(api.passwordConfirmation.confirm(typed)).resolves.toEqual({
      confirmed_until: "2026-11-20T17:00:00Z",
    });
    expect(http.post).toHaveBeenCalledWith("/api/v1/admin/password-confirmation", { password: typed });
  });
});

describe("CA-03 step-up-confirmation", () => {
  it("un 422 vuelve a pedir la contraseña con el mensaje de la API, sin reintentar la operación", async () => {
    const message = "La contraseña no es correcta.";
    const confirm = vi.fn(async (..._args: unknown[]) => {
      throw apiError(422, message, { password: [message] });
    });
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (..._args: unknown[]) => {
      throw stepUpError("window");
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit(typed);
    await flush();

    expect(h.last.open).toBe(true);
    expect(h.last.status).toBe("wrong-password");
    expect(h.last.message).toBe(message);
    expect(operation).toHaveBeenCalledTimes(1);

    const markup = renderDialog({ status: "wrong-password", message });
    expect(markup).toMatch(/role="alert"[^>]*>La contraseña no es correcta\./);
    expect(markup).toContain('aria-describedby="step-up-error"');
    expect(markup).toContain('value=""');
    h.controller.cancel();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
  });

  it("el campo se vacía al enviar (la vista llama setPassword(\"\") antes de onSubmit)", () => {
    const view = read("components/StepUpConfirmationDialog.tsx");

    expect(view).toMatch(/setPassword\(""\);\s*onSubmit\(value\)/);
  });
});

describe("CA-04 step-up-confirmation", () => {
  it("un 429 muestra el contador m:ss, deshabilita Confirmar y no reintenta (texto armado por el dashboard, CA-21)", async () => {
    const message = "Demasiados intentos. Intenta de nuevo en 30 segundos.";
    const confirm = vi.fn(async (..._args: unknown[]) => {
      throw rateLimitError(30);
    });
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (..._args: unknown[]) => {
      throw stepUpError("window");
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit(typed);
    await flush();

    expect(h.last).toMatchObject({
      open: true,
      status: "rate-limited",
      message,
      retryAfterSeconds: 30,
    });
    expect(operation).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(1);

    const markup = renderDialog({ status: "rate-limited", message, retryAfterSeconds: 30 });
    expect(markup).toContain("Demasiados intentos. Podrás intentarlo de nuevo en");
    expect(markup).toContain("0:30");
    expect(markup).not.toContain("30 segundos");
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*type="submit"|<button[^>]*type="submit"[^>]*disabled=""/);
    h.controller.cancel();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
  });
});

describe("CA-05 step-up-confirmation", () => {
  it("dentro de la ventana la operación se envía sin diálogo; tras expirar la API vuelve a pedirlo", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const operation = vi
      .fn()
      .mockResolvedValueOnce("primera") // ventana vigente: 200 sin diálogo
      .mockRejectedValueOnce(stepUpError("window")) // la API decide que expiró
      .mockResolvedValueOnce("tercera");

    await expect(h.controller.runProtected(operation)).resolves.toBe("primera");
    expect(h.states.some((state) => state.open)).toBe(false);
    expect(confirm).not.toHaveBeenCalled();

    const second = h.controller.runProtected(operation);

    await flush();
    expect(h.last.open).toBe(true);
    h.controller.submit(typed);
    await expect(second).resolves.toBe("tercera");
  });

  it("el cliente no calcula expiración: no lee confirmed_until ni usa temporizadores", () => {
    const source = read("viewmodels/step-up.ts") + read("viewmodels/useStepUpConfirmation.ts");

    expect(source).not.toContain("confirmed_until");
    expect(source).not.toMatch(/setInterval|Date\.now|new Date/);
  });
});

describe("CA-06 step-up-confirmation", () => {
  it("modo always: reenvía la operación con password en el cuerpo y no llama a confirm", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const api = createTicketSalesApiMock();
    const input = { adult_amount: "70.00", child_amount: "35.00", mode: "immediate" as const };
    api.prices.schedule.mockRejectedValueOnce(stepUpError("always"));
    const prices = createHarness(ticketPricesReducer, initialTicketPricesState);

    const result = submitPriceChange(api, prices.dispatch, input, () => true, h.controller.runProtected);

    await flush();
    expect(h.last).toMatchObject({ open: true, mode: "always" });
    h.controller.submit(typed);

    expect(await result).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(api.prices.schedule).toHaveBeenNthCalledWith(1, input);
    expect(api.prices.schedule).toHaveBeenNthCalledWith(2, { ...input, password: typed });
    expect(JSON.stringify(prices.state)).not.toContain(typed);
  });

  it("cada operación Siempre pide la contraseña de nuevo, aunque exista una confirmación previa", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (password?: string) => {
      if (password === undefined) throw stepUpError("always");

      return password;
    });

    for (const value of [typed, "Otra-ficticia-3"]) {
      const pending = h.controller.runProtected(operation);

      await flush();
      expect(h.last.open).toBe(true);
      h.controller.submit(value);
      await expect(pending).resolves.toBe(value);
    }
    expect(confirm).not.toHaveBeenCalled();
  });

  it("un 422 en Siempre vuelve a pedir la contraseña; un 422 de otro campo se propaga", async () => {
    const h = controllerHarness();
    const wrong = apiError(422, "La contraseña no es correcta.", {
      password: ["La contraseña no es correcta."],
    });
    const operation = vi.fn(async (password?: string) => {
      if (password === undefined) throw stepUpError("always");
      if (password === "mala") throw wrong;

      return "ok";
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit("mala");
    await flush();
    expect(h.last.status).toBe("wrong-password");
    h.controller.submit(typed);
    await expect(pending).resolves.toBe("ok");

    const other = apiError(422, "Datos no válidos.", { first_name: ["Obligatorio."] });
    await expect(
      runWithStepUp(
        async (password?: string) => {
          if (password === undefined) throw stepUpError("always");
          throw other;
        },
        { askPassword: async () => typed, confirm: async () => ({}) },
      ),
    ).rejects.toBe(other);
  });

  it("usuarios: cambiar el rol y restablecer el 2FA reenvían con password", async () => {
    const h = controllerHarness();
    const api = createAdminApiMock();
    const hu = createHarness<StaffState, StaffAction>(staffAccountsReducer, {
      ...initialStaffState,
      status: "ready",
      items: [staffAccount()],
      pendingAction: { type: "reset-two-factor", id: 7 },
    });

    api.users.resetTwoFactor.mockRejectedValueOnce(stepUpError("always"));
    const result = confirmStaffAction(
      api, hu.dispatch, hu.state, "", async () => undefined, h.controller.runProtected,
    );

    await flush();
    h.controller.submit(adminTyped);
    await result;

    expect(api.users.resetTwoFactor).toHaveBeenNthCalledWith(1, 7);
    expect(api.users.resetTwoFactor).toHaveBeenNthCalledWith(2, 7, adminTyped);
  });

  it("api-client: DELETE two-factor y precios llevan password en el cuerpo", async () => {
    const http = { delete: vi.fn(async () => ({})), post: vi.fn(async () => ({})) };

    await createAdminApi(http as never).users.resetTwoFactor(7, typed);
    expect(http.delete).toHaveBeenCalledWith("/api/v1/admin/users/7/two-factor", { password: typed });
    await createAdminApi(http as never).users.resetTwoFactor(7);
    expect(http.delete).toHaveBeenLastCalledWith("/api/v1/admin/users/7/two-factor", undefined);
    await createTicketSalesApi(http as never).prices.schedule({
      adult_amount: "70.00", child_amount: "35.00", mode: "immediate", password: typed,
    });
    expect(http.post).toHaveBeenCalledWith(
      "/api/v1/admin/ticket-prices",
      expect.objectContaining({ password: typed }),
    );
  });
});

describe("CA-07 step-up-confirmation", () => {
  it("la vista, el hook y el orquestador no usan almacenamiento, cookies, historial ni logs", () => {
    const files = [
      "components/StepUpConfirmationDialog.tsx",
      "components/StepUpProvider.tsx",
      "viewmodels/useStepUpConfirmation.ts",
      "viewmodels/step-up.ts",
      "viewmodels/step-up-context.ts",
    ];

    for (const file of files) {
      expect(read(file), file).not.toMatch(
        /localStorage|sessionStorage|document\.cookie|history\.|location\.|console\.|fetch\(|axios/,
      );
    }
  });

  it("el controlador no conserva la contraseña: solo guarda el resolver pendiente", async () => {
    const h = controllerHarness();
    const pending = h.controller.runProtected(async (password?: string) => {
      if (password === undefined) throw stepUpError("always");

      return "ok";
    });

    await flush();
    h.controller.submit(typed);
    await pending;

    expect(JSON.stringify(h.states)).not.toContain(typed);
    expect(h.last).toEqual(closedStepUpDialog);
  });

  it("la vista vacía el campo al cerrar (limpieza del efecto de apertura)", () => {
    expect(read("components/StepUpConfirmationDialog.tsx")).toMatch(
      /return \(\) => \{\s*setPassword\(""\);/,
    );
  });
});

describe("CA-08 step-up-confirmation", () => {
  it("cancelar no envía ninguna petición ni ejecuta la operación y el cancelar el boleto sigue abierto", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const api = createTicketSalesApiMock();
    api.history.cancel.mockRejectedValueOnce(stepUpError("window"));
    const history = createHarness(ticketHistoryReducer, initialTicketHistoryState);
    const target = historyRow();

    history.dispatch({ type: "cancel-opened", target });
    const result = cancelTicket(
      api, history.dispatch, target, cancelInput("Motivo"), history.state.query, () => true,
      h.controller.runProtected,
    );

    await flush();
    h.controller.cancel();

    expect(await result).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
    expect(api.history.cancel).toHaveBeenCalledTimes(1);
    expect(history.state.cancel.busy).toBe(false);
    expect(history.state.cancel.error).toBe("");
    expect(h.last.open).toBe(false);
  });

  it("Escape y «Cancelar» llaman onCancel; el foco vuelve al disparador al cerrar", () => {
    const view = read("components/StepUpConfirmationDialog.tsx");
    const dialog = readFileSync(
      fileURLToPath(new URL("../../../../packages/ui/src/index.tsx", import.meta.url)),
      "utf8",
    );

    expect(view).toContain("onClose={onCancel}");
    expect(view).toMatch(/onClick=\{onCancel\}/);
    expect(dialog).toMatch(/onCancel=\{\(event\) => \{\s*event\.preventDefault\(\);\s*onClose\(\);/);
    expect(view).toMatch(/trigger\.current\?\.focus\(\)/);
    expect(view).toContain("document.activeElement");
  });

  it("recintos: cancelar la contraseña no muestra error ni deja la operación ocupada", async () => {
    const h = controllerHarness();
    const api = { enclosures: { regenerateQr: vi.fn(async () => { throw stepUpError("window"); }) } };
    const actions: EnclosureQrAction[] = [];

    const result = regenerateEnclosureQr(
      api as never, 3, (action) => actions.push(action), { onHasQr: vi.fn(), onNotFound: vi.fn() },
      h.controller.runProtected,
    );

    await flush();
    h.controller.cancel();
    await result;

    expect(actions.at(-1)).toEqual({ type: "operation-failed", message: "" });
    expect(isStepUpCancelled(new StepUpCancelledError())).toBe(true);
  });
});

describe("CA-12 step-up-confirmation", () => {
  it("operaciones «No pide» con 200 o 201 no abren el diálogo", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => ({}));
    const h = controllerHarness(confirm);
    const operations = [
      vi.fn(async () => ({ status: 200 })), // venta, cotización, exportación
      vi.fn(async () => ({ status: 201 })), // primera generación de QR, alta de recinto
    ];

    for (const operation of operations) {
      await h.controller.runProtected(operation);
    }

    expect(h.states.some((state) => state.open)).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("venta, cotización, exportación, noticias, eventos, recuerdos, especies y alta de recintos no usan runProtected", () => {
    for (const file of [
      "viewmodels/ticket-sale.ts",
      "viewmodels/useTicketSale.ts",
      "viewmodels/ticket-report.ts",
      "viewmodels/useTicketReport.ts",
      "viewmodels/news-management.ts",
      "viewmodels/events-management.ts",
      "viewmodels/memory-review.ts",
      "viewmodels/species-requests.ts",
      "viewmodels/published-species.ts",
    ]) {
      expect(read(file), file).not.toMatch(/runProtected|useRunProtected|RunProtected/);
    }

    const enclosures = read("viewmodels/enclosures-management.ts");
    expect(enclosures.match(/protect\(/g)?.length).toBe(1); // solo `remove`
    expect(read("viewmodels/enclosure-qr.ts").match(/protect\(/g)?.length).toBe(1); // solo regenerar
  });

  it("usuarios: crear, editar sin cambiar rol y cambiar estado pasan por la API sin pedir contraseña si responde 200", async () => {
    const h = controllerHarness();
    const api = createAdminApiMock();
    const hu = createHarness<StaffState, StaffAction>(staffAccountsReducer, {
      ...initialStaffState,
      status: "ready",
      items: [staffAccount()],
    });

    await saveStaffAccount(api, hu.dispatch, hu.state, async () => undefined, h.controller.runProtected);

    expect(api.users.create).toHaveBeenCalledTimes(1);
    expect(h.states.some((state) => state.open)).toBe(false);
    expect(runUnprotected).toBeTypeOf("function");
  });
});

describe("CA-13 step-up-confirmation", () => {
  it("el diálogo es modal, tiene título asociado, campo de contraseña y errores anunciados", () => {
    const markup = renderDialog({ mode: "always", status: "wrong-password", message: "La contraseña no es correcta." });

    expect(markup).toContain('aria-modal="true"');
    expect(markup).toMatch(/aria-labelledby="(dialog-title-[^"]+)"/);
    const titleId = /aria-labelledby="([^"]+)"/.exec(markup)?.[1];
    expect(markup).toContain(`id="${titleId}"`);
    expect(markup).toContain('type="password"');
    expect(markup).toContain('autoComplete="current-password"');
    expect(markup).toContain('aria-live="assertive"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('role="alert"');
  });

  it("durante el envío muestra un estado con role=status y bloquea Confirmar", () => {
    const markup = renderDialog({ status: "submitting" });

    expect(markup).toMatch(/role="status"[^>]*>Confirmando…/);
  });

  it("Dialog nativo de @arca/ui atrapa el foco con showModal y usa aria-modal", () => {
    const dialog = readFileSync(
      fileURLToPath(new URL("../../../../packages/ui/src/index.tsx", import.meta.url)),
      "utf8",
    );

    expect(dialog).toContain("showModal()");
    expect(dialog).toContain('aria-modal="true"');
  });
});

describe("CA-15 step-up-confirmation", () => {
  it("los textos del diálogo están en español y los mensajes de la API se muestran tal cual", () => {
    const always = renderDialog({ mode: "always" });

    expect(always).toContain("Confirma tu contraseña");
    expect(always).toContain("Confirma tu contraseña para realizar esta acción.");
    expect(always).toContain(">Contraseña<");
    expect(always).toContain(">Confirmar<");
    expect(always).toContain(">Cancelar<");
    expect(renderDialog({ mode: "window" })).toContain("Por seguridad, confirma tu contraseña");

    const api = "Mensaje de la API sin traducir.";
    expect(renderDialog({ status: "error", message: api })).toContain(api);
  });

  it("un error de red o 5xx en la confirmación se muestra en el diálogo y no reintenta la operación", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => {
      throw apiError(500, "No fue posible completar la solicitud. Intenta de nuevo.");
    });
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (..._args: unknown[]) => {
      throw stepUpError("window");
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit(typed);
    await flush();

    expect(h.last.status).toBe("error");
    expect(h.last.message).toBe("No fue posible completar la solicitud. Intenta de nuevo.");
    expect(operation).toHaveBeenCalledTimes(1);
    h.controller.cancel();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
  });
});

describe("CA-17 step-up-confirmation", () => {
  it("restablecer la contraseña reenvía current_password (administrador) y password (nueva)", async () => {
    const h = controllerHarness();
    const api = createAdminApiMock();
    const hu = createHarness<StaffState, StaffAction>(staffAccountsReducer, {
      ...initialStaffState,
      status: "ready",
      items: [staffAccount()],
      pendingAction: { type: "reset-password", id: 7 },
    });

    api.users.resetPassword.mockRejectedValueOnce(stepUpError("always"));
    const result = confirmStaffAction(
      api, hu.dispatch, hu.state, "Nueva-ficticia-4", async () => undefined, h.controller.runProtected,
    );

    await flush();
    expect(h.last.mode).toBe("always");
    h.controller.submit(adminTyped);
    await result;

    expect(api.users.resetPassword).toHaveBeenNthCalledWith(1, 7, "Nueva-ficticia-4");
    expect(api.users.resetPassword).toHaveBeenNthCalledWith(2, 7, "Nueva-ficticia-4", adminTyped);
    expect(JSON.stringify(hu.state)).not.toContain(adminTyped);
    expect(JSON.stringify(hu.state)).not.toContain("Nueva-ficticia-4");
  });

  it("un 422 de current_password vuelve a pedir la contraseña; uno de password (nueva) se propaga", async () => {
    const wrong = apiError(422, "La contraseña no es correcta.", {
      current_password: ["La contraseña no es correcta."],
    });
    const weak = apiError(422, "La contraseña es débil.", { password: ["Demasiado corta."] });
    const options = { passwordField: "current_password" as const };
    const asks = vi.fn(async () => typed);

    await expect(
      runWithStepUp(
        async (password?: string) => {
          if (password === undefined) throw stepUpError("always");
          throw weak;
        },
        { askPassword: asks, confirm: async () => ({}) },
        options,
      ),
    ).rejects.toBe(weak);

    let attempts = 0;
    await expect(
      runWithStepUp(
        async (password?: string) => {
          attempts += 1;
          if (password === undefined) throw stepUpError("always");
          if (attempts === 2) throw wrong;

          return "ok";
        },
        { askPassword: asks, confirm: async () => ({}) },
        options,
      ),
    ).resolves.toBe("ok");
  });

  it("api-client: PUT users/{id}/password envía password y current_password", async () => {
    const http = { put: vi.fn(async () => ({})) };

    await createAdminApi(http as never).users.resetPassword(7, "Nueva-ficticia-4", adminTyped);
    expect(http.put).toHaveBeenCalledWith("/api/v1/admin/users/7/password", {
      password: "Nueva-ficticia-4",
      current_password: adminTyped,
    });
  });
});

describe("CA-01 step-up-confirmation (api-client)", () => {
  it("apiError copia mode válido del 403 y descarta valores desconocidos", async () => {
    const respond = (mode: string) =>
      new Response(
        JSON.stringify({ message: "Confirma tu contraseña para realizar esta acción.", code: "password_confirmation_required", mode }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    let mode = "always";
    const http = createHttpClient({ baseUrl: "", fetchImpl: async () => respond(mode) });

    await expect(http.get("/x")).rejects.toMatchObject({ status: 403, code: "password_confirmation_required", mode: "always" });
    mode = "raro";
    await expect(http.get("/x")).rejects.not.toHaveProperty("mode");
  });
});

void testsDirectory;

describe("CA-20 step-up-confirmation (fallo de red en el diálogo)", () => {
  it("un TypeError de red al confirmar muestra el mensaje en español, nunca «Failed to fetch»", async () => {
    const confirm = vi.fn(async (..._args: unknown[]) => {
      throw new TypeError("Failed to fetch");
    });
    const h = controllerHarness(confirm);
    const operation = vi.fn(async (..._args: unknown[]) => {
      throw stepUpError("window");
    });
    const pending = h.controller.runProtected(operation);

    await flush();
    h.controller.submit(typed);
    await flush();

    expect(h.last.open).toBe(true);
    expect(h.last.status).toBe("error");
    expect(h.last.message).toBe(
      "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
    );
    expect(h.last.message).not.toContain("Failed to fetch");
    h.controller.cancel();
    await expect(pending).rejects.toBeInstanceOf(StepUpCancelledError);
  });
});
