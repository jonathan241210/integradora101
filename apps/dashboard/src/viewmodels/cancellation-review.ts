import type {
  AdminApi,
  CancellationReviewDto,
  CancellationReviewStatus,
  CancellationTrafficLightDto,
} from "./admin-types";
import { describeApiError } from "./api-errors";

/**
 * Revisión de cancelaciones (dashboard-021). La API decide niveles, textos y revisión
 * vigente (`api-027`); aquí solo hay estado del diálogo, validación temprana de la nota
 * (RN-04) y mapeo de errores (CA-08). No hay escritura local (RN-03).
 */

export const NOTE_MIN = 15;
export const NOTE_MAX = 255;
export const noteLengthMessage = "Escribe una nota de entre 15 y 255 caracteres.";
export const statusRequiredMessage = "Elige una de las dos opciones.";
export const reviewSavedMessage = "Revisión guardada.";

export const reviewStatusOptions: { value: CancellationReviewStatus; label: string }[] = [
  { value: "reviewed_ok", label: "Revisado: todo en orden" },
  { value: "clarification_required", label: "Requiere aclaración" },
];

export type ReviewTarget = {
  cashierId: number;
  cashierName: string;
  date: string;
};

/** Solo hay revisión con cajero registrado y semáforo (api-027 RN-10); la API sigue siendo la autoridad. */
export function reviewTargetFor(row: CancellationTrafficLightDto): ReviewTarget | null {
  if (row.cashier_id === null || row.traffic_light === null) return null;

  return { cashierId: row.cashier_id, cashierName: row.cashier_name, date: row.date };
}

/** CA-05: Normal sin revisión no ofrece botón; el resto sí. */
export function canOfferReview(row: CancellationTrafficLightDto): boolean {
  return reviewTargetFor(row) !== null && (row.traffic_light !== "normal" || row.review !== null);
}

export function reviewKey(target: Pick<ReviewTarget, "cashierId" | "date">): string {
  return `${target.cashierId}:${target.date}`;
}

/** Longitud en caracteres de la nota ya recortada. */
export function noteLength(note: string): number {
  return Array.from(note.trim()).length;
}

export function isNoteValid(note: string): boolean {
  const length = noteLength(note);

  return length >= NOTE_MIN && length <= NOTE_MAX;
}

/**
 * Texto que se anuncia a lectores de pantalla solo al cruzar los límites de la nota (15 y
 * 255). Dentro de cada tramo el texto no cambia, así que no se anuncia cada pulsación; por
 * debajo del mínimo no hay anuncio (el contador visible ya lo indica y el error sale al guardar).
 */
export function noteLimitAnnouncement(note: string): string {
  const length = noteLength(note);

  if (length > NOTE_MAX) return `Superaste el máximo de ${NOTE_MAX} caracteres.`;
  if (length >= NOTE_MIN) return `Ya alcanzaste el mínimo de ${NOTE_MIN} caracteres.`;

  return "";
}

export type ReviewDialogState = {
  target: ReviewTarget | null;
  status: CancellationReviewStatus | "";
  note: string;
  busy: boolean;
  /** Error general mostrado dentro del diálogo (422 sin campo, 429, 5xx, red). */
  error: string;
  fieldErrors: Record<string, string[]>;
  /** Cada incremento pide llevar el foco al campo «Nota» (CA-06). */
  noteFocusNonce: number;
  /** Mensaje de acción cerrada (403) o de éxito, para el aviso emergente. */
  notice: { tone: "success" | "error"; message: string; nonce: number } | null;
};

export const initialReviewDialogState: ReviewDialogState = {
  target: null,
  status: "",
  note: "",
  busy: false,
  error: "",
  fieldErrors: {},
  noteFocusNonce: 0,
  notice: null,
};

export type ReviewDialogAction =
  | { type: "open"; target: ReviewTarget }
  | { type: "close" }
  | { type: "status-changed"; status: CancellationReviewStatus }
  | { type: "note-changed"; note: string }
  | { type: "invalid"; fieldErrors: Record<string, string[]>; focusNote: boolean }
  | { type: "submit-started" }
  | { type: "saved" }
  | { type: "forbidden"; message: string }
  | { type: "submit-failed"; message: string; fieldErrors: Record<string, string[]> };

export function reviewDialogReducer(
  state: ReviewDialogState,
  action: ReviewDialogAction,
): ReviewDialogState {
  switch (action.type) {
    case "open":
      return { ...initialReviewDialogState, target: action.target, notice: state.notice };
    case "close":
      return { ...state, target: null, busy: false, error: "", fieldErrors: {} };
    case "status-changed":
      return { ...state, status: action.status, error: "", fieldErrors: { ...state.fieldErrors, status: [] } };
    case "note-changed":
      return { ...state, note: action.note, error: "", fieldErrors: { ...state.fieldErrors, note: [] } };
    case "invalid":
      return {
        ...state,
        fieldErrors: action.fieldErrors,
        noteFocusNonce: state.noteFocusNonce + (action.focusNote ? 1 : 0),
      };
    case "submit-started":
      return { ...state, busy: true, error: "", fieldErrors: {} };
    case "saved":
      return {
        ...initialReviewDialogState,
        noteFocusNonce: state.noteFocusNonce,
        notice: { tone: "success", message: reviewSavedMessage, nonce: (state.notice?.nonce ?? 0) + 1 },
      };
    case "forbidden":
      return {
        ...initialReviewDialogState,
        noteFocusNonce: state.noteFocusNonce,
        notice: { tone: "error", message: action.message, nonce: (state.notice?.nonce ?? 0) + 1 },
      };
    case "submit-failed": {
      const hasFields = Object.values(action.fieldErrors).some((list) => list.length > 0);

      return {
        ...state,
        busy: false,
        // 422 con campo va junto al campo; el resto (p. ej. «ya tiene esa decisión») en el diálogo.
        error: hasFields ? "" : action.message,
        fieldErrors: action.fieldErrors,
      };
    }
    default:
      return state;
  }
}

export type ReviewHistoryState = {
  key: string | null;
  status: "idle" | "loading" | "ready" | "error";
  items: CancellationReviewDto[];
  error: string;
};

export const initialReviewHistoryState: ReviewHistoryState = {
  key: null,
  status: "idle",
  items: [],
  error: "",
};

export type ReviewHistoryAction =
  | { type: "close" }
  | { type: "load-started"; key: string }
  | { type: "loaded"; key: string; items: CancellationReviewDto[] }
  | { type: "load-failed"; key: string; message: string };

export function reviewHistoryReducer(
  state: ReviewHistoryState,
  action: ReviewHistoryAction,
): ReviewHistoryState {
  switch (action.type) {
    case "close":
      return initialReviewHistoryState;
    case "load-started":
      return { key: action.key, status: "loading", items: [], error: "" };
    case "loaded":
      return state.key === action.key ? { ...state, status: "ready", items: action.items } : state;
    case "load-failed":
      return state.key === action.key ? { ...state, status: "error", error: action.message } : state;
    default:
      return state;
  }
}

type ReviewApi = Pick<AdminApi["reports"], "createCancellationReview" | "listCancellationReviews">;

/**
 * Valida la nota y envía la revisión. Con nota corta no llama a la API (CA-06). Sin
 * reintento automático (CA-08). Devuelve `true` solo si la API guardó (CA-07).
 */
export async function submitCancellationReview(
  api: ReviewApi,
  dispatch: (action: ReviewDialogAction) => void,
  state: ReviewDialogState,
): Promise<boolean> {
  const { target } = state;

  if (!target || state.busy) return false;

  if (state.status === "") {
    dispatch({ type: "invalid", fieldErrors: { status: [statusRequiredMessage] }, focusNote: false });

    return false;
  }

  if (!isNoteValid(state.note)) {
    dispatch({ type: "invalid", fieldErrors: { note: [noteLengthMessage] }, focusNote: true });

    return false;
  }

  dispatch({ type: "submit-started" });

  try {
    await api.createCancellationReview({
      cashier_id: target.cashierId,
      business_date: target.date,
      status: state.status,
      note: state.note.trim(),
    });
    dispatch({ type: "saved" });

    return true;
  } catch (error) {
    const described = describeApiError(error);

    if (described.unauthorized) {
      dispatch({ type: "close" });
    } else if (described.forbidden) {
      dispatch({ type: "forbidden", message: described.message });
    } else {
      dispatch({
        type: "submit-failed",
        message: described.message,
        fieldErrors: described.fieldErrors,
      });
    }

    return false;
  }
}

/**
 * Envía la revisión y, si la API la guardó (CA-07), refresca lo que quedó viejo: el reporte
 * vuelve a pedirse con `onSaved` y, si el detalle de esa fila sigue abierto, su historial se
 * recarga (CA-09); si el abierto es otro, no se toca. Función pura de flujo: sin DOM.
 */
export async function submitReviewAndRefresh(deps: {
  api: ReviewApi;
  dispatchDialog: (action: ReviewDialogAction) => void;
  dispatchHistory: (action: ReviewHistoryAction) => void;
  dialog: ReviewDialogState;
  /** Clave del historial abierto en el momento de terminar de guardar. */
  getOpenHistoryKey: () => string | null;
  /** Invalida cargas de historial anteriores y devuelve el vigilante de la nueva. */
  startHistoryLoad: () => () => boolean;
  onSaved: () => void;
}): Promise<boolean> {
  const { dialog } = deps;
  const saved = await submitCancellationReview(deps.api, deps.dispatchDialog, dialog);

  if (!saved || !dialog.target) return false;

  const target = dialog.target;
  const reopen = deps.getOpenHistoryKey() === reviewKey(target);

  // El reporte trae la revisión vigente (RN-05); el historial abierto de esa fila se vuelve a cargar.
  deps.onSaved();
  if (reopen) {
    await loadCancellationReviewHistory(deps.api, deps.dispatchHistory, target, deps.startHistoryLoad());
  }

  return true;
}

/** Historial de la API, de la más reciente a la más antigua (CA-09). */
export async function loadCancellationReviewHistory(
  api: ReviewApi,
  dispatch: (action: ReviewHistoryAction) => void,
  target: ReviewTarget,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  const key = reviewKey(target);

  dispatch({ type: "load-started", key });

  try {
    const items = await api.listCancellationReviews(target.cashierId, target.date);

    if (isCurrent()) dispatch({ type: "loaded", key, items });
  } catch (error) {
    const described = describeApiError(error);

    if (isCurrent() && !described.unauthorized) {
      dispatch({ type: "load-failed", key, message: described.message });
    }
  }
}

export type CancellationReviewViewModel = {
  dialog: ReviewDialogState;
  history: ReviewHistoryState;
  actions: {
    open: (target: ReviewTarget) => void;
    close: () => void;
    setStatus: (status: CancellationReviewStatus) => void;
    setNote: (note: string) => void;
    submit: () => void;
    toggleHistory: (target: ReviewTarget) => void;
  };
};
