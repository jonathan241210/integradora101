/**
 * Confirmación de contraseña por operación (dashboard-015). El cliente no
 * decide qué operación la pide (RN-01): reacciona al 403
 * `password_confirmation_required` y usa `mode` del cuerpo. No calcula la
 * ventana de 10 minutos (RN-03) ni conserva la contraseña (RN-02).
 */

export type StepUpMode = "window" | "always";

export type StepUpStatus =
  | "idle"
  | "submitting"
  | "wrong-password"
  | "rate-limited"
  | "error"
  | "confirmed";

/** Resultado del intento anterior que el diálogo debe presentar. */
export type StepUpFeedback =
  | { kind: "none" }
  | { kind: "wrong-password"; message: string }
  | { kind: "rate-limited"; message: string; retryAfterSeconds: number | null }
  | { kind: "error"; message: string };

type StepUpFailure = Exclude<StepUpFeedback, { kind: "none" }>;

/** Operación original: `password` solo se envía en modo Siempre. */
export type ProtectedOperation<T> = (password?: string) => Promise<T>;

/** Ejecuta una operación con confirmación de contraseña si la API la pide. */
export type RunProtected = <T>(
  operation: ProtectedOperation<T>,
  options?: StepUpOptions,
) => Promise<T>;

export type StepUpOptions = {
  /** Campo con el que la API reporta un 422 de contraseña incorrecta. */
  passwordField?: "password" | "current_password";
};

export type StepUpDeps = {
  /** Muestra el diálogo y devuelve lo escrito, o `null` si se cancela. */
  askPassword: (mode: StepUpMode, feedback: StepUpFeedback) => Promise<string | null>;
  /** `POST admin/password-confirmation` mediante `@arca/api-client`. */
  confirm: (password: string) => Promise<unknown>;
  onStatus?: (status: StepUpStatus) => void;
};

export class StepUpCancelledError extends Error {
  constructor() {
    super("Confirmación cancelada.");
    this.name = "StepUpCancelledError";
  }
}

export function isStepUpCancelled(error: unknown): boolean {
  return error instanceof StepUpCancelledError;
}

/** Sin diálogo: ejecuta la operación tal cual (uso por defecto fuera del proveedor). */
export const runUnprotected: RunProtected = (operation) => operation();

type ErrorShape = {
  status?: unknown;
  code?: unknown;
  mode?: unknown;
  message?: unknown;
  errors?: unknown;
  retryAfterSeconds?: unknown;
};

function shape(error: unknown): ErrorShape {
  return typeof error === "object" && error !== null ? (error as ErrorShape) : {};
}

/** `{ mode }` si es un 403 `password_confirmation_required` válido; si no, `null`. */
export function readPasswordConfirmationRequirement(
  error: unknown,
): { mode: StepUpMode } | null {
  const candidate = shape(error);

  if (
    candidate.status === 403 &&
    candidate.code === "password_confirmation_required" &&
    (candidate.mode === "window" || candidate.mode === "always")
  ) {
    return { mode: candidate.mode };
  }

  return null;
}

const wrongPasswordFallback = "La contraseña no es correcta.";
const genericFallback = "No fue posible completar la solicitud. Intenta de nuevo.";
const networkFallback =
  "No fue posible conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";

/** Solo un mensaje de la API (con `status` HTTP) se muestra; un fallo de red nunca llega crudo a la UI. */
function apiText(error: unknown, fallback: string): string {
  const { status, message } = shape(error);

  if (typeof status !== "number" || status === 0) return networkFallback;

  return typeof message === "string" && message.trim() ? message : fallback;
}

function fieldMessage(error: unknown, field: string): string | null {
  const { errors } = shape(error);

  if (typeof errors !== "object" || errors === null) return null;

  const messages = (errors as Record<string, unknown>)[field];

  if (Array.isArray(messages)) {
    const first = messages.find((value): value is string => typeof value === "string");

    return first ?? null;
  }

  return null;
}

function wrongPassword(error: unknown, field: string): StepUpFailure | null {
  const candidate = shape(error);

  if (candidate.status !== 422) return null;

  const message = fieldMessage(error, field);

  if (message !== null) return { kind: "wrong-password", message };
  // Sin cuerpo de campos, un 422 de la confirmación es contraseña incorrecta.
  if (field === "password" && candidate.errors === undefined) {
    return { kind: "wrong-password", message: apiText(error, wrongPasswordFallback) };
  }

  return null;
}

function rateLimited(error: unknown): StepUpFailure | null {
  const candidate = shape(error);

  if (candidate.status !== 429) return null;

  const seconds = candidate.retryAfterSeconds;

  return {
    kind: "rate-limited",
    message: apiText(error, genericFallback),
    retryAfterSeconds:
      typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0 ? seconds : null,
  };
}

function isTransient(error: unknown): boolean {
  const status = shape(error).status;

  return typeof status !== "number" || status === 0 || status >= 500;
}

/**
 * Orquesta la operación protegida (RN-10). Primera llamada sin contraseña;
 * Ventana: confirmar y un reintento por confirmación; Siempre: reenviar con
 * `password`. 401 y errores no relacionados se propagan sin diálogo.
 */
export async function runWithStepUp<T>(
  operation: ProtectedOperation<T>,
  deps: StepUpDeps,
  options: StepUpOptions = {},
): Promise<T> {
  const field = options.passwordField ?? "password";
  const status = (value: StepUpStatus) => deps.onStatus?.(value);

  let requirement: { mode: StepUpMode } | null;

  try {
    return await operation(undefined);
  } catch (error) {
    requirement = readPasswordConfirmationRequirement(error);
    if (!requirement) throw error;
  }

  let mode = requirement.mode;
  let feedback: StepUpFeedback = { kind: "none" };

  for (;;) {
    const password = await deps.askPassword(mode, feedback);

    if (password === null) throw new StepUpCancelledError();

    feedback = { kind: "none" };
    status("submitting");

    if (mode === "window") {
      try {
        await deps.confirm(password);
      } catch (error) {
        const known = wrongPassword(error, "password") ?? rateLimited(error);

        if (known) {
          feedback = known;
          status(known.kind);
          continue;
        }
        if (isTransient(error)) {
          feedback = { kind: "error", message: apiText(error, genericFallback) };
          status("error");
          continue;
        }
        throw error;
      }

      status("confirmed");

      // Un solo reintento automático por confirmación exitosa (RN-10).
      try {
        return await operation(undefined);
      } catch (error) {
        const next = readPasswordConfirmationRequirement(error);

        if (!next) throw error;
        mode = next.mode;
        continue;
      }
    }

    try {
      return await operation(password);
    } catch (error) {
      const known = wrongPassword(error, field) ?? rateLimited(error);

      if (known) {
        feedback = known;
        status(known.kind);
        continue;
      }

      const next = readPasswordConfirmationRequirement(error);

      if (next) {
        mode = next.mode;
        continue;
      }
      throw error;
    }
  }
}

/** Estado que presenta el diálogo (RN-08). */
export type StepUpDialogState = {
  open: boolean;
  mode: StepUpMode;
  status: StepUpStatus;
  message: string;
  retryAfterSeconds: number | null;
};

export const closedStepUpDialog: StepUpDialogState = {
  open: false,
  mode: "window",
  status: "idle",
  message: "",
  retryAfterSeconds: null,
};

export type StepUpController = {
  runProtected: RunProtected;
  /** La vista entrega la contraseña; el controlador no la conserva. */
  submit: (password: string) => void;
  cancel: () => void;
  /** Cancela cualquier promesa pendiente (desmontaje o cierre de sesión, CA-14). */
  dispose: () => void;
};

/**
 * Controlador sin React del diálogo: guarda solo el resolver de la promesa
 * pendiente y nunca la contraseña (RN-02). El hook lo envuelve con estado.
 */
export function createStepUpController(
  confirm: (password: string) => Promise<unknown>,
  onChange: (dialog: StepUpDialogState) => void,
): StepUpController {
  let resolver: ((password: string | null) => void) | null = null;
  let current: StepUpDialogState = closedStepUpDialog;

  const publish = (next: StepUpDialogState) => {
    current = next;
    onChange(next);
  };

  const settle = (password: string | null) => {
    const resolve = resolver;

    resolver = null;
    resolve?.(password);
  };

  const askPassword = (mode: StepUpMode, feedback: StepUpFeedback) =>
    new Promise<string | null>((resolve) => {
      resolver = resolve;
      publish({
        open: true,
        mode,
        status: feedback.kind === "none" ? "idle" : feedback.kind,
        message: feedback.kind === "none" ? "" : feedback.message,
        retryAfterSeconds:
          feedback.kind === "rate-limited" ? feedback.retryAfterSeconds : null,
      });
    });

  return {
    runProtected: async <T,>(operation: ProtectedOperation<T>, options?: StepUpOptions) => {
      try {
        return await runWithStepUp(
          operation,
          {
            askPassword,
            confirm,
            onStatus: (status) => {
              if (status === "submitting" || status === "confirmed") {
                publish({ ...current, status, message: "", retryAfterSeconds: null });
              }
            },
          },
          options,
        );
      } finally {
        publish(closedStepUpDialog);
      }
    },
    submit: (password) => settle(password),
    cancel: () => settle(null),
    dispose: () => settle(null),
  };
}
