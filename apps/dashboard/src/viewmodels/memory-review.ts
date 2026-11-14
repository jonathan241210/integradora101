import type {
  AdminApi,
  MemoryRejectedField,
  MemoryReviewDetailDto,
  MemoryReviewStatus,
  MemoryReviewSummaryDto,
} from "./admin-types";
import {
  MEMORY_ACCEPTED_NOTICE,
  MEMORY_REJECTED_NOTICE,
  canConfirmRejection,
  describeMemoryError,
  isMemoryStateConflict,
  memoryFieldErrors,
  sanitizeRejectedFields,
  validateMemoryReason,
  type BlobPreview,
} from "./memory-review-shared";

/**
 * ViewModel de «Momentos» (dashboard-008 CA-02 a CA-12, CA-17 a CA-19).
 * Reducers y funciones con cliente y vista previa inyectados. La API decide
 * estados, transiciones, plazos y permisos (RN-01, RN-03): aquí solo se
 * presenta lo que devuelve.
 */

export type MemoryFilter = "" | MemoryReviewStatus;

/** «Todas» no envía `status`; el resto viaja tal cual (CA-03). */
export const memoryFilterOptions: { value: MemoryFilter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "submitted", label: "Enviada" },
  { value: "in_review", label: "En proceso" },
  { value: "accepted", label: "Aceptada" },
  { value: "rejected", label: "Rechazada" },
];

export type MemoryListContext = {
  api: AdminApi;
  dispatch: (action: MemoryListAction) => void;
  isCurrent: () => boolean;
};

export type MemoryListState = {
  filter: MemoryFilter;
  page: number;
  status: "loading" | "ready" | "empty" | "error";
  items: MemoryReviewSummaryDto[];
  hasMore: boolean;
  error: string;
  forbidden: boolean;
  /** Solo el 5xx o la red ofrecen «Reintentar». */
  retryable: boolean;
};

export const initialMemoryListState: MemoryListState = {
  // Flujo 2 de la spec: la lista carga la primera página de Enviadas.
  filter: "submitted",
  page: 1,
  status: "loading",
  items: [],
  hasMore: false,
  error: "",
  forbidden: false,
  retryable: false,
};

export type MemoryListAction =
  | { type: "filter-changed"; filter: MemoryFilter }
  | { type: "page-changed"; page: number }
  | { type: "list-loading" }
  | { type: "list-loaded"; items: MemoryReviewSummaryDto[]; hasMore: boolean }
  | { type: "list-failed"; message: string; forbidden: boolean; retryable: boolean };

export function memoryListReducer(state: MemoryListState, action: MemoryListAction): MemoryListState {
  switch (action.type) {
    case "filter-changed":
      return { ...state, filter: action.filter, page: 1, ...clearedRows };
    case "page-changed":
      return { ...state, page: Math.max(1, action.page), ...clearedRows };
    case "list-loading":
      return { ...state, ...clearedRows };
    case "list-loaded":
      return {
        ...state,
        status: action.items.length === 0 ? "empty" : "ready",
        items: action.items,
        hasMore: action.hasMore,
        error: "",
        forbidden: false,
        retryable: false,
      };
    case "list-failed":
      return {
        ...state,
        status: "error",
        items: [],
        hasMore: false,
        error: action.message,
        forbidden: action.forbidden,
        retryable: action.retryable,
      };
    default:
      return state;
  }
}

/** Ninguna fila anterior queda visible como actual (CA-11). */
const clearedRows = {
  status: "loading",
  items: [],
  hasMore: false,
  error: "",
  forbidden: false,
  retryable: false,
} as const satisfies Partial<MemoryListState>;

export function changeFilter(ctx: Pick<MemoryListContext, "dispatch">, filter: MemoryFilter): void {
  ctx.dispatch({ type: "filter-changed", filter });
}

export function changePage(ctx: Pick<MemoryListContext, "dispatch">, page: number): void {
  ctx.dispatch({ type: "page-changed", page });
}

/** Pide la página a la API; `status` se omite en «Todas» y no se filtra en el cliente. */
export async function loadList(
  ctx: MemoryListContext,
  query: { filter: MemoryFilter; page: number },
): Promise<void> {
  ctx.dispatch({ type: "list-loading" });

  try {
    const result = await ctx.api.memoryReview.list({
      status: query.filter === "" ? undefined : query.filter,
      page: query.page,
    });

    if (ctx.isCurrent()) {
      ctx.dispatch({
        type: "list-loaded",
        items: result.data,
        hasMore: result.meta.has_more,
      });
    }
  } catch (error) {
    const described = describeMemoryError(error, "list");

    if (ctx.isCurrent() && !described.unauthorized) {
      ctx.dispatch({
        type: "list-failed",
        message: described.message,
        forbidden: described.forbidden,
        retryable: described.retryable,
      });
    }
  }
}

/* ------------------------------ Detalle ------------------------------ */

export type MemoryImageState = {
  status: "idle" | "loading" | "ready" | "error" | "not-found";
  /** URL `blob:` creada por el ViewModel; solo en memoria (CA-17). */
  url: string;
};

export type MemoryDecision = null | "accept" | "reject";

export type MemoryDetailState = {
  status: "idle" | "loading" | "ready" | "error" | "not-found";
  data: MemoryReviewDetailDto | null;
  error: string;
  forbidden: boolean;
  retryable: boolean;
  image: MemoryImageState;
  pendingAction: MemoryDecision;
  rejectReason: string;
  rejectFields: MemoryRejectedField[];
  busy: boolean;
  dialogError: string;
  fieldErrors: Record<string, string[]>;
  /** Decisión tardía (CA-10): mensaje de la API en `role="alert"`. */
  alert: string;
  notice: string;
};

const idleImage: MemoryImageState = { status: "idle", url: "" };

export const initialMemoryDetailState: MemoryDetailState = {
  status: "idle",
  data: null,
  error: "",
  forbidden: false,
  retryable: false,
  image: idleImage,
  pendingAction: null,
  rejectReason: "",
  rejectFields: [],
  busy: false,
  dialogError: "",
  fieldErrors: {},
  alert: "",
  notice: "",
};

export type MemoryDetailAction =
  | { type: "detail-opening" }
  | { type: "detail-closed" }
  | { type: "detail-loaded"; data: MemoryReviewDetailDto }
  | {
      type: "detail-failed";
      message: string;
      forbidden: boolean;
      notFound: boolean;
      retryable: boolean;
    }
  | { type: "image-changed"; image: MemoryImageState }
  | { type: "decision-opened"; decision: Exclude<MemoryDecision, null> }
  | { type: "decision-closed" }
  | { type: "reject-reason-changed"; reason: string }
  | { type: "reject-field-toggled"; field: MemoryRejectedField }
  | { type: "decision-started" }
  | { type: "decision-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "decision-succeeded"; notice: string }
  | { type: "decision-conflict"; message: string }
  | { type: "notice-dismissed" }
  | { type: "alert-dismissed" };

export function memoryDetailReducer(
  state: MemoryDetailState,
  action: MemoryDetailAction,
): MemoryDetailState {
  switch (action.type) {
    case "detail-opening":
      return { ...initialMemoryDetailState, status: "loading" };
    case "detail-closed":
      return initialMemoryDetailState;
    case "detail-loaded":
      return {
        ...state,
        status: "ready",
        data: action.data,
        error: "",
        forbidden: false,
        retryable: false,
      };
    case "detail-failed":
      // Ningún error deja datos anteriores visibles como actuales (CA-11).
      return {
        ...state,
        status: action.notFound ? "not-found" : "error",
        data: null,
        error: action.message,
        forbidden: action.forbidden,
        retryable: action.retryable,
        image: state.image,
        pendingAction: null,
        busy: false,
      };
    case "image-changed":
      return { ...state, image: action.image };
    case "decision-opened":
      return {
        ...state,
        pendingAction: action.decision,
        rejectReason: "",
        rejectFields: [],
        dialogError: "",
        fieldErrors: {},
        busy: false,
      };
    case "decision-closed":
      return {
        ...state,
        pendingAction: null,
        rejectReason: "",
        rejectFields: [],
        dialogError: "",
        fieldErrors: {},
        busy: false,
      };
    case "reject-reason-changed":
      return { ...state, rejectReason: action.reason, fieldErrors: dropField(state.fieldErrors, "rejection_reason") };
    case "reject-field-toggled": {
      const selected = state.rejectFields.includes(action.field)
        ? state.rejectFields.filter((field) => field !== action.field)
        : [...state.rejectFields, action.field];

      return {
        ...state,
        rejectFields: sanitizeRejectedFields(selected),
        fieldErrors: dropField(state.fieldErrors, "rejected_fields"),
      };
    }
    case "decision-started":
      return { ...state, busy: true, dialogError: "", fieldErrors: {} };
    case "decision-failed":
      return {
        ...state,
        busy: false,
        dialogError: action.message,
        fieldErrors: action.fieldErrors,
      };
    case "decision-succeeded":
      return {
        ...state,
        pendingAction: null,
        rejectReason: "",
        rejectFields: [],
        busy: false,
        dialogError: "",
        fieldErrors: {},
        alert: "",
        notice: action.notice,
      };
    case "decision-conflict":
      return {
        ...state,
        pendingAction: null,
        rejectReason: "",
        rejectFields: [],
        busy: false,
        dialogError: "",
        fieldErrors: {},
        notice: "",
        alert: action.message,
      };
    case "notice-dismissed":
      return { ...state, notice: "" };
    case "alert-dismissed":
      return { ...state, alert: "" };
    default:
      return state;
  }
}

function dropField(errors: Record<string, string[]>, field: string): Record<string, string[]> {
  const { [field]: _removed, ...rest } = errors;

  return rest;
}

export type MemoryDetailContext = {
  api: AdminApi;
  dispatch: (action: MemoryDetailAction) => void;
  preview: BlobPreview;
  getState: () => MemoryDetailState;
  isCurrent: () => boolean;
};

/** Revoca la URL `blob:` de la imagen abierta (CA-17). */
export function releaseImage(preview: BlobPreview, state: Pick<MemoryDetailState, "image">): void {
  if (state.image.url) preview.revoke(state.image.url);
}

/**
 * Pide la imagen como blob por la ruta autenticada (CA-17). Un `blob.type` que
 * no empieza por `image/` es error; 404 es `not-found` (CA-18). La URL se crea
 * solo si la respuesta sigue vigente: nada que revocar tarde.
 */
export async function loadImage(ctx: MemoryDetailContext, id: number): Promise<void> {
  releaseImage(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "image-changed", image: { status: "loading", url: "" } });

  try {
    const file = await ctx.api.memoryReview.image(id);

    if (!ctx.isCurrent()) return;

    if (!file.blob.type.startsWith("image/")) {
      ctx.dispatch({ type: "image-changed", image: { status: "error", url: "" } });

      return;
    }

    ctx.dispatch({
      type: "image-changed",
      image: { status: "ready", url: ctx.preview.create(file.blob) },
    });
  } catch (error) {
    if (!ctx.isCurrent()) return;

    const described = describeMemoryError(error, "detail");

    if (described.unauthorized) return;

    ctx.dispatch({
      type: "image-changed",
      image: { status: described.notFound ? "not-found" : "error", url: "" },
    });
  }
}

/** Pide el detalle; devuelve el DTO o `null` si falló o ya no es vigente. */
export async function loadDetail(
  ctx: MemoryDetailContext,
  id: number,
): Promise<MemoryReviewDetailDto | null> {
  try {
    const data = await ctx.api.memoryReview.get(id);

    if (!ctx.isCurrent()) return null;

    ctx.dispatch({ type: "detail-loaded", data });

    return data;
  } catch (error) {
    const described = describeMemoryError(error, "detail");

    if (ctx.isCurrent() && !described.unauthorized) {
      ctx.dispatch({
        type: "detail-failed",
        message: described.message,
        forbidden: described.forbidden,
        notFound: described.notFound,
        retryable: described.retryable,
      });
    }

    return null;
  }
}

/**
 * Abre una petición: revoca la imagen anterior, pide el detalle (la API la
 * pasa a En proceso, sin acción adicional) y después la imagen (CA-05, CA-17).
 */
export async function openDetail(ctx: MemoryDetailContext, id: number): Promise<void> {
  releaseImage(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-opening" });

  const detail = await loadDetail(ctx, id);

  if (detail && ctx.isCurrent()) await loadImage(ctx, id);
}

/** Cierra el detalle: revoca la URL `blob:` y limpia el estado (CA-17). */
export function closeDetail(ctx: MemoryDetailContext): void {
  releaseImage(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-closed" });
}

/** Recarga solo el detalle, con el estado actual de la API (CA-10, CA-08). */
export async function reloadDetail(ctx: MemoryDetailContext, id: number): Promise<void> {
  await loadDetail(ctx, id);
}

export function openDecision(ctx: Pick<MemoryDetailContext, "dispatch">, decision: Exclude<MemoryDecision, null>): void {
  ctx.dispatch({ type: "decision-opened", decision });
}

export function closeDecision(ctx: Pick<MemoryDetailContext, "dispatch">): void {
  ctx.dispatch({ type: "decision-closed" });
}

/** Presentación de las acciones según `status` y la imagen (CA-07, CA-18). */
export type MemoryDetailActions = {
  canDecide: boolean;
  canAccept: boolean;
  /** Texto bajo «Aceptar» cuando está deshabilitado por falta de imagen. */
  acceptBlockedByImage: boolean;
};

export function detailActions(state: MemoryDetailState): MemoryDetailActions {
  const data = state.data;
  const canDecide = data !== null && (data.status === "submitted" || data.status === "in_review");
  const hasDays = data !== null && Number.isFinite(data.publication_days) && data.publication_days >= 1;
  const imageReady = state.image.status === "ready";

  return {
    canDecide,
    canAccept: canDecide && imageReady && hasDays && !state.busy,
    acceptBlockedByImage: canDecide && state.image.status !== "loading" && !imageReady,
  };
}

/** Maneja el error de una decisión; devuelve `true` si recargó por conflicto. */
async function handleDecisionError(
  ctx: MemoryDetailContext,
  id: number,
  error: unknown,
): Promise<void> {
  const described = describeMemoryError(error, "decision");

  if (!ctx.isCurrent()) return;

  if (described.unauthorized) {
    ctx.dispatch({ type: "decision-failed", message: "", fieldErrors: {} });

    return;
  }

  if (isMemoryStateConflict(described)) {
    ctx.dispatch({ type: "decision-conflict", message: described.message });
    await loadDetail(ctx, id);

    return;
  }

  const fields = memoryFieldErrors(described.fieldErrors);

  // Los errores de campo del rechazo van junto al campo; el de la imagen y los
  // demás se muestran dentro del diálogo, que no se cierra.
  const message = fields.image
    ? fields.image.join(" ")
    : fields.rejection_reason || fields.rejected_fields
      ? ""
      : described.message;

  ctx.dispatch({ type: "decision-failed", message, fieldErrors: fields });

  // Aceptar sin archivo (errors.image): se muestra en el diálogo y se recarga.
  if (fields.image) await loadDetail(ctx, id);
}

/**
 * Aceptar: solo con detalle listo, imagen `ready` y `publication_days`
 * (CA-18, plan pregunta 5). Tras el éxito se vuelve a pedir el detalle.
 * Devuelve `true` si la API aceptó.
 */
export async function acceptRequest(ctx: MemoryDetailContext, id: number): Promise<boolean> {
  const state = ctx.getState();

  if (!detailActions(state).canAccept) return false;

  ctx.dispatch({ type: "decision-started" });

  try {
    await ctx.api.memoryReview.accept(id);
  } catch (error) {
    await handleDecisionError(ctx, id, error);

    return false;
  }

  if (!ctx.isCurrent()) return true;

  ctx.dispatch({ type: "decision-succeeded", notice: MEMORY_ACCEPTED_NOTICE });
  await loadDetail(ctx, id);

  return true;
}

/**
 * Rechazar con motivo y casillas. Sin motivo válido o sin casilla no se llama a
 * la API (CA-09). Devuelve `true` si la API rechazó.
 */
export async function rejectRequest(ctx: MemoryDetailContext, id: number): Promise<boolean> {
  const state = ctx.getState();

  if (!state.data || !detailActions(state).canDecide) return false;
  if (!canConfirmRejection(state.rejectReason, state.rejectFields)) return false;

  ctx.dispatch({ type: "decision-started" });

  try {
    await ctx.api.memoryReview.reject(id, {
      rejection_reason: validateMemoryReason(state.rejectReason).value,
      rejected_fields: sanitizeRejectedFields(state.rejectFields),
    });
  } catch (error) {
    await handleDecisionError(ctx, id, error);

    return false;
  }

  if (!ctx.isCurrent()) return true;

  ctx.dispatch({ type: "decision-succeeded", notice: MEMORY_REJECTED_NOTICE });
  await loadDetail(ctx, id);

  return true;
}

/* ------------------------- Tipos para las vistas ------------------------- */

export type MemoryListViewModel = {
  state: MemoryListState;
  actions: {
    changeFilter: (filter: MemoryFilter) => void;
    goToPage: (page: number) => void;
    reload: () => void;
  };
};

export type MemoryDetailViewModel = {
  state: MemoryDetailState;
  actions: {
    reload: () => void;
    openAccept: () => void;
    openReject: () => void;
    closeDecision: () => void;
    changeRejectReason: (reason: string) => void;
    toggleRejectField: (field: MemoryRejectedField) => void;
    confirmDecision: () => void;
    dismissNotice: () => void;
    dismissAlert: () => void;
  };
};
