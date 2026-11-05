import { describeApiError } from "./api-errors";
import type { ConfirmationCopy } from "./confirmation";
import { formatCurrency } from "./formatters";
import { formatTicketDateTime } from "./ticket-history";
import type {
  TicketPriceCurrentDto,
  TicketPriceMode,
  TicketPriceScheduleInput,
  TicketSalesApi,
} from "./ticket-types";

export const twoFactorRequiredMessage =
  "Para cambiar los precios debes configurar el segundo factor de autenticación de tu cuenta. Cierra sesión y vuelve a ingresar para completarlo.";

export type TicketPriceForm = {
  adultAmount: string;
  childAmount: string;
  mode: TicketPriceMode;
  /** Valor de `datetime-local` (`AAAA-MM-DDTHH:mm`) en la hora del dispositivo. */
  effectiveAt: string;
};

export type TicketPricesState = {
  status: "loading" | "ready" | "error";
  current: TicketPriceCurrentDto | null;
  error: string;
  form: TicketPriceForm;
  /** Cambio validado que espera la confirmación explícita (RN-03). */
  pending: TicketPriceScheduleInput | null;
  saving: boolean;
  fieldErrors: Record<string, string[]>;
  actionError: string;
  twoFactorRequired: boolean;
  notice: string;
};

export type TicketPricesAction =
  | { type: "form-changed"; changes: Partial<TicketPriceForm> }
  | { type: "load-started" }
  | { type: "loaded"; current: TicketPriceCurrentDto }
  | { type: "load-failed"; message: string; twoFactorRequired: boolean }
  | { type: "confirmation-requested"; input: TicketPriceScheduleInput }
  | { type: "confirmation-rejected"; fieldErrors: Record<string, string[]> }
  | { type: "confirmation-cancelled" }
  | { type: "save-started" }
  | { type: "save-aborted" }
  | {
      type: "save-failed";
      message: string;
      fieldErrors: Record<string, string[]>;
      twoFactorRequired: boolean;
    }
  | { type: "saved"; current: TicketPriceCurrentDto; notice: string }
  | { type: "notice-dismissed" };

export type TicketPricesDispatch = (action: TicketPricesAction) => void;

export const initialTicketPriceForm: TicketPriceForm = {
  adultAmount: "",
  childAmount: "",
  mode: "immediate",
  effectiveAt: "",
};

export const initialTicketPricesState: TicketPricesState = {
  status: "loading",
  current: null,
  error: "",
  form: initialTicketPriceForm,
  pending: null,
  saving: false,
  fieldErrors: {},
  actionError: "",
  twoFactorRequired: false,
  notice: "",
};

export function ticketPricesReducer(
  state: TicketPricesState,
  action: TicketPricesAction,
): TicketPricesState {
  switch (action.type) {
    case "form-changed":
      return {
        ...state,
        form: { ...state.form, ...action.changes },
        fieldErrors: {},
        actionError: "",
        notice: "",
      };
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return {
        ...state,
        status: "ready",
        current: action.current,
        error: "",
        twoFactorRequired: false,
      };
    case "load-failed":
      return {
        ...state,
        status: "error",
        error: action.message,
        twoFactorRequired: action.twoFactorRequired || state.twoFactorRequired,
      };
    case "confirmation-requested":
      return {
        ...state,
        pending: action.input,
        fieldErrors: {},
        actionError: "",
        notice: "",
      };
    case "confirmation-rejected":
      return { ...state, fieldErrors: action.fieldErrors, actionError: "" };
    case "confirmation-cancelled":
      return state.saving ? state : { ...state, pending: null };
    case "save-started":
      return { ...state, saving: true, actionError: "", fieldErrors: {} };
    case "save-aborted":
      return { ...state, saving: false, pending: null };
    case "save-failed":
      return {
        ...state,
        saving: false,
        pending: null,
        fieldErrors: action.fieldErrors,
        actionError: action.message,
        twoFactorRequired: action.twoFactorRequired,
      };
    case "saved":
      return {
        ...state,
        saving: false,
        pending: null,
        current: action.current,
        status: "ready",
        form: initialTicketPriceForm,
        fieldErrors: {},
        actionError: "",
        notice: action.notice,
      };
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

function isTwoFactorRequired(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { status?: unknown }).status === 403 &&
    (error as { code?: unknown }).code === "two_factor_setup_required"
  );
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/**
 * Convierte la fecha y hora locales del formulario (`datetime-local`) a un
 * instante ISO 8601 con el desfase del dispositivo. Es conversión de entrada
 * (decisión 3 de api-009); la API valida que sea futura.
 */
export function localDateTimeToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);

  if (!match) return null;

  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );

  if (Number.isNaN(date.getTime())) return null;

  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const absolute = Math.abs(offset);

  return (
    `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(absolute / 60))}:${pad(absolute % 60)}`
  );
}

export type PriceInputResult =
  | { ok: true; input: TicketPriceScheduleInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

/**
 * Arma el cuerpo a enviar. Solo comprueba que los campos existan; montos
 * válidos y fecha futura los valida la API (RN-02).
 */
export function buildPriceInput(form: TicketPriceForm): PriceInputResult {
  const fieldErrors: Record<string, string[]> = {};
  const adult = form.adultAmount.trim();
  const child = form.childAmount.trim();

  if (!adult) fieldErrors.adult_amount = ["Indica el precio de adulto."];
  if (!child) fieldErrors.child_amount = ["Indica el precio de niño."];

  let effectiveAt: string | null = null;

  if (form.mode === "scheduled") {
    effectiveAt = localDateTimeToIso(form.effectiveAt);
    if (!effectiveAt) {
      fieldErrors.effective_at = ["Indica la fecha y la hora de entrada en vigor."];
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  return {
    ok: true,
    input: {
      adult_amount: adult,
      child_amount: child,
      mode: form.mode,
      ...(effectiveAt ? { effective_at: effectiveAt } : {}),
    },
  };
}

/** Texto de la confirmación: nombra los montos y cuándo entran en vigor. */
export function priceConfirmationCopy(
  input: TicketPriceScheduleInput | null,
): ConfirmationCopy | null {
  if (!input) return null;

  const when =
    input.mode === "scheduled" && input.effective_at
      ? `el ${formatTicketDateTime(input.effective_at)}`
      : "de inmediato";

  return {
    title: "Confirmar cambio de precios",
    message:
      `Adulto ${formatCurrency(input.adult_amount)} y niño ${formatCurrency(input.child_amount)} ` +
      `entrarán en vigor ${when}.`,
    confirmLabel: "Confirmar cambio",
    danger: false,
  };
}

export function priceSavedNotice(input: TicketPriceScheduleInput): string {
  return input.mode === "scheduled" && input.effective_at
    ? `Cambio de precios programado para el ${formatTicketDateTime(input.effective_at)}.`
    : "Los precios se actualizaron y ya están vigentes.";
}

/** Carga el precio vigente y el próximo programado de cada tipo. */
export async function loadTicketPrices(
  api: TicketSalesApi,
  dispatch: TicketPricesDispatch,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const current = await api.prices.current();

    if (isCurrent()) dispatch({ type: "loaded", current });
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      const twoFactorRequired = isTwoFactorRequired(error);

      dispatch({
        type: "load-failed",
        message: twoFactorRequired ? twoFactorRequiredMessage : described.message,
        twoFactorRequired,
      });
    }
  }
}

/** Valida los campos y abre la confirmación; no llama a la API. */
export function requestPriceConfirmation(
  dispatch: TicketPricesDispatch,
  form: TicketPriceForm,
): boolean {
  const result = buildPriceInput(form);

  if (!result.ok) {
    dispatch({ type: "confirmation-rejected", fieldErrors: result.fieldErrors });

    return false;
  }

  dispatch({ type: "confirmation-requested", input: result.input });

  return true;
}

/** Envía el cambio solo después de la confirmación (RN-03) y refresca el vigente. */
export async function submitPriceChange(
  api: TicketSalesApi,
  dispatch: TicketPricesDispatch,
  input: TicketPriceScheduleInput,
  isCurrent: () => boolean = () => true,
): Promise<boolean> {
  dispatch({ type: "save-started" });

  let result;

  try {
    result = await api.prices.schedule(input);
  } catch (error) {
    const described = describeApiError(error);

    if (described.unauthorized) {
      dispatch({ type: "save-aborted" });

      return false;
    }

    const twoFactorRequired = isTwoFactorRequired(error);

    dispatch({
      type: "save-failed",
      message: twoFactorRequired ? twoFactorRequiredMessage : described.message,
      fieldErrors: described.fieldErrors,
      twoFactorRequired,
    });

    return false;
  }

  dispatch({
    type: "saved",
    current: result.current,
    notice: priceSavedNotice(input),
  });

  // CA-17: refresca el vigente y el próximo; si falla se conserva lo devuelto.
  try {
    const current = await api.prices.current();

    if (isCurrent()) dispatch({ type: "loaded", current });
  } catch {
    // El 201 ya devolvió `current`.
  }

  return true;
}

export type TicketPricesViewModel = {
  state: TicketPricesState;
  actions: {
    changeForm: (changes: Partial<TicketPriceForm>) => void;
    requestConfirmation: () => void;
    cancelConfirmation: () => void;
    confirm: () => void;
    reload: () => void;
    dismissNotice: () => void;
  };
};
