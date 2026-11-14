import type {
  AdminApi,
  SpeciesFichaField,
  SpeciesRequestDetailDto,
  SpeciesRequestStatus,
  SpeciesRequestSummaryDto,
} from "./admin-types";
import type { ConfirmationCopy } from "./confirmation";
import type { ImagePreview } from "./image-field";
import {
  SAVE_BEFORE_PUBLISH_NOTICE,
  buildSheetUpdate,
  describeSpeciesError,
  draftFromSheet,
  formFieldErrors,
  isStateConflict,
  sheetIsDirty,
  validateRejectionReason,
  validateSpeciesPhoto,
  type SpeciesSheetDraft,
} from "./species-publication-shared";

/**
 * ViewModel de «Solicitudes de especies» (dashboard-010 CA-02 a CA-17, CA-61,
 * CA-62). Reducer y funciones con cliente inyectado: la API decide estados,
 * transiciones y permisos (RN-01); aquí solo se presenta lo que devuelve.
 */

export type RequestFilter = "" | SpeciesRequestStatus;

export const requestFilterOptions: { value: RequestFilter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "submitted", label: "Pendiente" },
  { value: "accepted", label: "Publicada" },
  { value: "rejected", label: "Rechazada" },
];

export type PhotoSlot = {
  status: "idle" | "loading" | "ready" | "error" | "none";
  /** URL `blob:` en memoria (RN-10); nunca una ruta pública de archivos (CA-44). */
  url: string;
};

export type PendingDecision = null | "accept-publish" | "accept-unpublished" | "reject";

export type SpeciesRequestsState = {
  filter: RequestFilter;
  page: number;
  list: {
    status: "loading" | "ready" | "empty" | "error";
    items: SpeciesRequestSummaryDto[];
    hasMore: boolean;
    error: string;
    forbidden: boolean;
  };
  selectedId: number | null;
  detail: {
    status: "idle" | "loading" | "ready" | "error" | "not-found";
    data: SpeciesRequestDetailDto | null;
    error: string;
    forbidden: boolean;
  };
  pendingPhoto: PhotoSlot;
  publishedPhoto: PhotoSlot;
  mode: "read" | "edit";
  baseline: SpeciesSheetDraft | null;
  draft: SpeciesSheetDraft | null;
  newPhoto: { file: File | null; previewUrl: string; error: string };
  fieldErrors: Record<string, string[]>;
  pendingAction: PendingDecision;
  rejectReason: string;
  busy: boolean;
  dialogError: string;
  notice: string;
};

const idlePhoto: PhotoSlot = { status: "idle", url: "" };
const noNewPhoto = { file: null, previewUrl: "", error: "" };

const closedDetail: Pick<
  SpeciesRequestsState,
  | "selectedId"
  | "detail"
  | "pendingPhoto"
  | "publishedPhoto"
  | "mode"
  | "baseline"
  | "draft"
  | "newPhoto"
  | "fieldErrors"
  | "pendingAction"
  | "rejectReason"
  | "busy"
  | "dialogError"
> = {
  selectedId: null,
  detail: { status: "idle", data: null, error: "", forbidden: false },
  pendingPhoto: idlePhoto,
  publishedPhoto: idlePhoto,
  mode: "read",
  baseline: null,
  draft: null,
  newPhoto: noNewPhoto,
  fieldErrors: {},
  pendingAction: null,
  rejectReason: "",
  busy: false,
  dialogError: "",
};

export const initialSpeciesRequestsState: SpeciesRequestsState = {
  filter: "submitted",
  page: 1,
  list: { status: "loading", items: [], hasMore: false, error: "", forbidden: false },
  ...closedDetail,
  notice: "",
};

export type SpeciesRequestsAction =
  | { type: "filter-changed"; filter: RequestFilter }
  | { type: "page-changed"; page: number }
  | { type: "list-loading" }
  | { type: "list-loaded"; items: SpeciesRequestSummaryDto[]; hasMore: boolean }
  | { type: "list-failed"; message: string; forbidden: boolean }
  | { type: "detail-opening"; id: number }
  | { type: "detail-closed" }
  | { type: "detail-loaded"; data: SpeciesRequestDetailDto }
  | { type: "detail-failed"; message: string; forbidden: boolean; notFound: boolean }
  | { type: "photo-changed"; slot: "pending" | "published"; photo: PhotoSlot }
  | { type: "edit-started" }
  | { type: "edit-cancelled" }
  | { type: "draft-changed"; changes: Partial<SpeciesSheetDraft> }
  | { type: "new-photo-chosen"; file: File; previewUrl: string }
  | { type: "new-photo-rejected"; error: string }
  | { type: "new-photo-cleared" }
  | { type: "save-started" }
  | { type: "save-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "saved"; data: SpeciesRequestDetailDto; notice: string }
  | { type: "decision-opened"; decision: Exclude<PendingDecision, null> }
  | { type: "decision-closed" }
  | { type: "reject-reason-changed"; reason: string }
  | { type: "decision-started" }
  | { type: "decision-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "decision-done"; notice: string }
  | { type: "notice-set"; notice: string }
  | { type: "notice-dismissed" };

export function speciesRequestsReducer(
  state: SpeciesRequestsState,
  action: SpeciesRequestsAction,
): SpeciesRequestsState {
  switch (action.type) {
    case "filter-changed":
      return {
        ...state,
        filter: action.filter,
        page: 1,
        list: { ...state.list, status: "loading", items: [], error: "", forbidden: false },
      };
    case "page-changed":
      return {
        ...state,
        page: action.page,
        list: { ...state.list, status: "loading", items: [], error: "", forbidden: false },
      };
    case "list-loading":
      return { ...state, list: { ...state.list, status: "loading", items: [], error: "" } };
    case "list-loaded":
      return {
        ...state,
        list: {
          status: action.items.length === 0 ? "empty" : "ready",
          items: action.items,
          hasMore: action.hasMore,
          error: "",
          forbidden: false,
        },
      };
    case "list-failed":
      // Sin filas anteriores como si fueran actuales (CA-04).
      return {
        ...state,
        list: {
          status: "error",
          items: [],
          hasMore: false,
          error: action.message,
          forbidden: action.forbidden,
        },
      };
    case "detail-opening":
      return {
        ...state,
        ...closedDetail,
        selectedId: action.id,
        detail: { status: "loading", data: null, error: "", forbidden: false },
        notice: "",
      };
    case "detail-closed":
      return { ...state, ...closedDetail };
    case "detail-loaded":
      return {
        ...state,
        detail: { status: "ready", data: action.data, error: "", forbidden: false },
      };
    case "detail-failed":
      return {
        ...state,
        ...closedDetail,
        selectedId: state.selectedId,
        detail: {
          status: action.notFound ? "not-found" : "error",
          data: null,
          error: action.message,
          forbidden: action.forbidden,
        },
      };
    case "photo-changed":
      return action.slot === "pending"
        ? { ...state, pendingPhoto: action.photo }
        : { ...state, publishedPhoto: action.photo };
    case "edit-started": {
      const data = state.detail.data;

      if (!data || data.status !== "submitted") return state;

      const baseline = draftFromSheet(data.proposed);

      return {
        ...state,
        mode: "edit",
        baseline,
        draft: baseline,
        newPhoto: noNewPhoto,
        fieldErrors: {},
        notice: "",
      };
    }
    case "edit-cancelled":
      return {
        ...state,
        mode: "read",
        baseline: null,
        draft: null,
        newPhoto: noNewPhoto,
        fieldErrors: {},
      };
    case "draft-changed":
      return state.draft
        ? {
            ...state,
            draft: { ...state.draft, ...action.changes },
            fieldErrors: {},
          }
        : state;
    case "new-photo-chosen":
      return {
        ...state,
        newPhoto: { file: action.file, previewUrl: action.previewUrl, error: "" },
        fieldErrors: { ...state.fieldErrors, image: [] },
      };
    case "new-photo-rejected":
      return { ...state, newPhoto: { ...noNewPhoto, error: action.error } };
    case "new-photo-cleared":
      return { ...state, newPhoto: noNewPhoto };
    case "save-started":
      return { ...state, busy: true, fieldErrors: {} };
    case "save-failed":
      return { ...state, busy: false, fieldErrors: action.fieldErrors, dialogError: action.message };
    case "saved":
      return {
        ...state,
        busy: false,
        mode: "read",
        baseline: null,
        draft: null,
        newPhoto: noNewPhoto,
        fieldErrors: {},
        dialogError: "",
        detail: { status: "ready", data: action.data, error: "", forbidden: false },
        notice: action.notice,
      };
    case "decision-opened":
      return { ...state, pendingAction: action.decision, rejectReason: "", dialogError: "", fieldErrors: {} };
    case "decision-closed":
      return state.busy
        ? state
        : { ...state, pendingAction: null, rejectReason: "", dialogError: "", fieldErrors: {} };
    case "reject-reason-changed":
      return { ...state, rejectReason: action.reason, dialogError: "", fieldErrors: {} };
    case "decision-started":
      return { ...state, busy: true, dialogError: "", fieldErrors: {} };
    case "decision-failed":
      return {
        ...state,
        busy: false,
        fieldErrors: action.fieldErrors,
        dialogError: Object.keys(action.fieldErrors).length > 0 ? "" : action.message,
      };
    case "decision-done":
      return {
        ...state,
        busy: false,
        pendingAction: null,
        rejectReason: "",
        dialogError: "",
        fieldErrors: {},
        notice: action.notice,
      };
    case "notice-set":
      return { ...state, notice: action.notice };
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

/** Cambios sin guardar del formulario (CA-10): borrador distinto o foto elegida. */
export function requestIsDirty(state: SpeciesRequestsState): boolean {
  return state.mode === "edit"
    ? sheetIsDirty(state.baseline, state.draft, state.newPhoto.file !== null)
    : false;
}

/** Contexto de las funciones con efectos: cliente, dispatch y vista previa inyectados. */
export type RequestsContext = {
  api: AdminApi;
  dispatch: (action: SpeciesRequestsAction) => void;
  preview: ImagePreview;
  getState: () => SpeciesRequestsState;
  isCurrent: () => boolean;
};

export const requestPublishedNotice = "Especie publicada. Ya es visible en el catálogo público.";
export const requestAcceptedUnpublishedNotice =
  "Cambios aceptados. La especie sigue despublicada.";
export const requestRejectedNotice = "Solicitud rechazada. La especie no se publicó.";
export const requestSavedNotice = "Cambios guardados. La solicitud sigue pendiente.";
export const unpublishedCatalogWarning =
  "La especie no aparece en el catálogo hasta que la aceptes con «Aceptar y publicar».";

export async function loadRequestList(
  ctx: RequestsContext,
  query: { filter: RequestFilter; page: number },
): Promise<void> {
  ctx.dispatch({ type: "list-loading" });

  try {
    // El filtro viaja a la API; nunca se filtra en el cliente (CA-02).
    const page = await ctx.api.speciesPublicationRequests.list({
      status: query.filter || undefined,
      page: query.page,
    });

    if (ctx.isCurrent()) {
      ctx.dispatch({ type: "list-loaded", items: page.data, hasMore: page.meta.has_more });
    }
  } catch (error) {
    const described = describeSpeciesError(error, "requests");

    if (ctx.isCurrent() && !described.unauthorized) {
      ctx.dispatch({
        type: "list-failed",
        message: described.message,
        forbidden: described.forbidden,
      });
    }
  }
}

function releaseSlot(ctx: RequestsContext, slot: PhotoSlot) {
  if (slot.url) ctx.preview.revoke(slot.url);
}

/** Revoca todas las URL `blob:` del detalle abierto (CA-06, CA-49). */
export function releaseDetailUrls(
  preview: ImagePreview,
  state: Pick<SpeciesRequestsState, "pendingPhoto" | "publishedPhoto" | "newPhoto">,
): void {
  for (const url of [state.pendingPhoto.url, state.publishedPhoto.url, state.newPhoto.previewUrl]) {
    if (url) preview.revoke(url);
  }
}

async function downloadSlot(
  ctx: RequestsContext,
  slot: "pending" | "published",
  fetchBlob: () => Promise<{ blob: Blob }>,
): Promise<void> {
  releaseSlot(ctx, slot === "pending" ? ctx.getState().pendingPhoto : ctx.getState().publishedPhoto);
  ctx.dispatch({ type: "photo-changed", slot, photo: { status: "loading", url: "" } });

  try {
    const file = await fetchBlob();

    if (!ctx.isCurrent()) return;

    // La URL se crea solo si la respuesta sigue vigente: nada que revocar tarde.
    ctx.dispatch({
      type: "photo-changed",
      slot,
      photo: { status: "ready", url: ctx.preview.create(file.blob as File) },
    });
  } catch {
    if (ctx.isCurrent()) {
      ctx.dispatch({ type: "photo-changed", slot, photo: { status: "error", url: "" } });
    }
  }
}

/** Foto pendiente (si la solicitud trae una) y publicada (si la especie la tiene). */
export async function loadRequestPhotos(
  ctx: RequestsContext,
  detail: SpeciesRequestDetailDto,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (detail.proposed.has_new_photo) {
    tasks.push(
      downloadSlot(ctx, "pending", () => ctx.api.speciesPublicationRequests.image(detail.id)),
    );
  } else {
    releaseSlot(ctx, ctx.getState().pendingPhoto);
    ctx.dispatch({ type: "photo-changed", slot: "pending", photo: { status: "none", url: "" } });
  }

  if (detail.current.has_image) {
    tasks.push(downloadSlot(ctx, "published", () => ctx.api.publishedSpecies.image(detail.species_id)));
  } else {
    releaseSlot(ctx, ctx.getState().publishedPhoto);
    ctx.dispatch({ type: "photo-changed", slot: "published", photo: { status: "none", url: "" } });
  }

  await Promise.all(tasks);
}

/** Pide el detalle; devuelve el DTO o `null` si falló o ya no es vigente. */
export async function loadRequestDetail(
  ctx: RequestsContext,
  id: number,
): Promise<SpeciesRequestDetailDto | null> {
  try {
    const data = await ctx.api.speciesPublicationRequests.get(id);

    if (!ctx.isCurrent()) return null;

    ctx.dispatch({ type: "detail-loaded", data });

    return data;
  } catch (error) {
    const described = describeSpeciesError(error, "requests");

    if (ctx.isCurrent() && !described.unauthorized) {
      ctx.dispatch({
        type: "detail-failed",
        message: described.message,
        forbidden: described.forbidden,
        notFound: described.notFound,
      });
    }

    return null;
  }
}

/**
 * Abre una solicitud: revoca las URL anteriores (la respuesta tardía de otra
 * solicitud no escribe, CA-06), pide el detalle y después sus fotos.
 */
export async function openRequest(ctx: RequestsContext, id: number): Promise<void> {
  releaseDetailUrls(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-opening", id });

  const detail = await loadRequestDetail(ctx, id);

  if (detail && ctx.isCurrent()) await loadRequestPhotos(ctx, detail);
}

/** Cierra el detalle y revoca las URL `blob:` (CA-06, CA-49). */
export function closeRequestDetail(ctx: RequestsContext): void {
  releaseDetailUrls(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-closed" });
}

/** Recarga detalle y fotos tras una decisión o un 422 de estado (CA-09, CA-12). */
export async function reloadRequest(ctx: RequestsContext, id: number): Promise<void> {
  const detail = await loadRequestDetail(ctx, id);

  if (detail && ctx.isCurrent()) await loadRequestPhotos(ctx, detail);
}

export function startRequestEdit(ctx: RequestsContext): void {
  ctx.dispatch({ type: "edit-started" });
}

export function cancelRequestEdit(ctx: RequestsContext): void {
  const preview = ctx.getState().newPhoto.previewUrl;

  if (preview) ctx.preview.revoke(preview);
  ctx.dispatch({ type: "edit-cancelled" });
}

/** Vista previa de la foto elegida, sin subirla (CA-49). */
export function chooseRequestPhoto(ctx: RequestsContext, file: File): void {
  const error = validateSpeciesPhoto(file);

  if (error) {
    ctx.dispatch({ type: "new-photo-rejected", error });

    return;
  }

  const previous = ctx.getState().newPhoto.previewUrl;

  if (previous) ctx.preview.revoke(previous);
  ctx.dispatch({ type: "new-photo-chosen", file, previewUrl: ctx.preview.create(file) });
}

export function clearRequestPhoto(ctx: RequestsContext): void {
  const previous = ctx.getState().newPhoto.previewUrl;

  if (previous) ctx.preview.revoke(previous);
  ctx.dispatch({ type: "new-photo-cleared" });
}

/**
 * Guarda la edición con PATCH de solo los campos cambiados (CA-07). El estado
 * sigue Pendiente. 422 por campo queda junto al campo; 422 de estado
 * («ya fue revisada») recarga el detalle (CA-09).
 */
export async function saveRequestEdit(ctx: RequestsContext): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || !state.baseline || !state.draft || state.mode !== "edit" || state.busy) {
    return false;
  }

  const built = buildSheetUpdate(state.baseline, state.draft, state.newPhoto.file);

  if (!built.input) {
    ctx.dispatch({ type: "save-failed", message: "", fieldErrors: built.fieldErrors });

    return false;
  }

  const sentPhoto = state.newPhoto.file !== null;

  ctx.dispatch({ type: "save-started" });

  try {
    const data = await ctx.api.speciesPublicationRequests.update(detail.id, built.input);

    if (!ctx.isCurrent()) return false;

    const preview = state.newPhoto.previewUrl;

    if (preview) ctx.preview.revoke(preview);
    ctx.dispatch({ type: "saved", data, notice: requestSavedNotice });
    if (sentPhoto) await loadRequestPhotos(ctx, data);

    return true;
  } catch (error) {
    const described = describeSpeciesError(error, "requests");

    if (!ctx.isCurrent() || described.unauthorized) return false;

    const stateConflict = isStateConflict(described);

    ctx.dispatch({
      type: "save-failed",
      message: described.message,
      fieldErrors: formFieldErrors(described.fieldErrors),
    });

    if (stateConflict) {
      cancelRequestEdit(ctx);
      ctx.dispatch({ type: "notice-set", notice: described.message });
      await reloadRequest(ctx, detail.id);
    }

    return false;
  }
}

/**
 * Acepta con `publish` true o false (CA-11, CA-62). Con cambios sin guardar
 * no llama a la API (CA-10). La API responde con la ficha de la especie, no
 * con la solicitud (G-4): se recarga el detalle.
 */
export async function acceptRequest(ctx: RequestsContext, publish: boolean): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || state.busy || requestIsDirty(state)) return false;

  ctx.dispatch({ type: "decision-started" });

  try {
    await ctx.api.speciesPublicationRequests.accept(detail.id, { publish });

    if (!ctx.isCurrent()) return false;

    ctx.dispatch({
      type: "decision-done",
      notice: publish ? requestPublishedNotice : requestAcceptedUnpublishedNotice,
    });
    await reloadRequest(ctx, detail.id);

    return true;
  } catch (error) {
    return failDecision(ctx, detail.id, error);
  }
}

/** Rechaza con motivo de 1 a 500 caracteres (CA-13, CA-14). */
export async function rejectRequest(ctx: RequestsContext, reason: string): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || state.busy) return false;

  const checked = validateRejectionReason(reason);

  if (checked.error) {
    ctx.dispatch({
      type: "decision-failed",
      message: checked.error,
      fieldErrors: { rejection_reason: [checked.error] },
    });

    return false;
  }

  ctx.dispatch({ type: "decision-started" });

  try {
    const data = await ctx.api.speciesPublicationRequests.reject(detail.id, {
      rejection_reason: checked.value,
    });

    if (!ctx.isCurrent()) return false;

    ctx.dispatch({ type: "decision-done", notice: requestRejectedNotice });
    ctx.dispatch({ type: "detail-loaded", data });
    await loadRequestPhotos(ctx, data);

    return true;
  } catch (error) {
    return failDecision(ctx, detail.id, error);
  }
}

/**
 * Error de una decisión: 422 por campo queda en el diálogo; 422 de estado
 * (decisión tardía, CA-12) muestra el mensaje, cierra y recarga.
 */
async function failDecision(ctx: RequestsContext, id: number, error: unknown): Promise<boolean> {
  const described = describeSpeciesError(error, "requests");

  if (!ctx.isCurrent()) return false;

  if (described.unauthorized) {
    ctx.dispatch({ type: "decision-closed" });

    return false;
  }

  if (isStateConflict(described)) {
    ctx.dispatch({ type: "decision-done", notice: described.message });
    await reloadRequest(ctx, id);

    return false;
  }

  ctx.dispatch({
    type: "decision-failed",
    message: described.message,
    fieldErrors: formFieldErrors(described.fieldErrors),
  });

  return false;
}

export type RequestActionAvailability = {
  canEdit: boolean;
  canAcceptPublish: boolean;
  canAcceptUnpublished: boolean;
  canReject: boolean;
  /** Aviso «Guarda los cambios antes de publicar.» (CA-10). */
  saveFirstNotice: string;
};

/**
 * Qué botones se muestran, a partir de los flags de la API (`status`,
 * `current.publication_status`). La decisión de fondo la repite la API.
 */
export function requestActions(
  detail: SpeciesRequestDetailDto,
  dirty: boolean,
): RequestActionAvailability {
  const pending = detail.status === "submitted";

  return {
    canEdit: pending,
    canAcceptPublish: pending,
    canAcceptUnpublished: pending && detail.current.publication_status === "unpublished",
    canReject: pending,
    saveFirstNotice: pending && dirty ? SAVE_BEFORE_PUBLISH_NOTICE : "",
  };
}

/** Texto de los diálogos de aceptar (CA-11, CA-62). */
export function acceptDialogCopy(
  detail: SpeciesRequestDetailDto,
  decision: "accept-publish" | "accept-unpublished",
): ConfirmationCopy {
  if (decision === "accept-unpublished") {
    return {
      title: "Aceptar sin publicar",
      message:
        "¿Aceptar sin publicar? Los cambios quedarán guardados, pero la especie seguirá oculta en el catálogo. Podrás republicarla desde TulanPedia, pestaña «Publicadas».",
      confirmLabel: "Confirmar",
      danger: false,
    };
  }

  if (detail.request_type === "update" && detail.current.publication_status !== "unpublished") {
    const replaced = detail.proposed.has_new_photo
      ? "se reemplazarán la foto y los datos publicados"
      : "se reemplazarán los datos publicados";

    return {
      title: "Aceptar y publicar",
      message: `¿Aceptar esta actualización? La ficha pública cambiará: ${replaced}.`,
      confirmLabel: "Confirmar",
      danger: false,
    };
  }

  return {
    title: "Aceptar y publicar",
    message:
      "¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.",
    confirmLabel: "Confirmar",
    danger: false,
  };
}

export const rejectDialogCopy: ConfirmationCopy = {
  title: "Rechazar solicitud",
  message: "¿Seguro que quieres rechazar esta solicitud?",
  confirmLabel: "Confirmar",
  danger: true,
};

export type SpeciesRequestsViewModel = {
  state: SpeciesRequestsState;
  dirty: boolean;
  actions: {
    changeFilter: (filter: RequestFilter) => void;
    goToPage: (page: number) => void;
    reload: () => void;
    open: (id: number) => void;
    close: () => void;
    reloadDetail: () => void;
    startEdit: () => void;
    cancelEdit: () => void;
    changeDraft: (changes: Partial<SpeciesSheetDraft>) => void;
    toggleField: (key: SpeciesFichaField) => void;
    choosePhoto: (file: File) => void;
    clearPhoto: () => void;
    save: () => void;
    openDecision: (decision: Exclude<PendingDecision, null>) => void;
    closeDecision: () => void;
    changeRejectReason: (reason: string) => void;
    confirmDecision: () => void;
    dismissNotice: () => void;
  };
};
