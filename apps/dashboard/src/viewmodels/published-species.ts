import type {
  AdminApi,
  PublishedSpeciesRowDto,
  SpeciesCategory,
  SpeciesFichaField,
  SpeciesPublicationDetailDto,
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
  validateSpeciesPhoto,
  type SpeciesSheetDraft,
} from "./species-publication-shared";
import type { PhotoSlot } from "./species-requests";

/**
 * ViewModel de «Especies publicadas» (dashboard-010 CA-51 a CA-59). Reducer y
 * funciones con cliente inyectado: la API decide estados, transiciones y
 * permisos (RN-01); aquí solo se presenta lo que devuelve.
 */

export type PublishedStatusFilter = "" | "published" | "unpublished";

export const publishedStatusOptions: { value: PublishedStatusFilter; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "published", label: "Publicadas" },
  { value: "unpublished", label: "Despublicadas" },
];

export type PublishedPendingAction = null | "unpublish" | "republish" | "remove";

export type PublishedSpeciesState = {
  statusFilter: PublishedStatusFilter;
  category: "" | SpeciesCategory;
  page: number;
  list: {
    status: "loading" | "ready" | "empty" | "error";
    items: PublishedSpeciesRowDto[];
    hasMore: boolean;
    error: string;
    forbidden: boolean;
  };
  /** Miniaturas por id de especie (URL `blob:` en memoria, RN-10). */
  thumbs: Record<number, PhotoSlot>;
  selectedId: number | null;
  detail: {
    status: "idle" | "loading" | "ready" | "error" | "not-found";
    data: SpeciesPublicationDetailDto | null;
    error: string;
    forbidden: boolean;
  };
  photo: PhotoSlot;
  mode: "read" | "edit";
  baseline: SpeciesSheetDraft | null;
  draft: SpeciesSheetDraft | null;
  newPhoto: { file: File | null; previewUrl: string; error: string };
  fieldErrors: Record<string, string[]>;
  pendingAction: PublishedPendingAction;
  busy: boolean;
  dialogError: string;
  notice: string;
};

const idlePhoto: PhotoSlot = { status: "idle", url: "" };
const noNewPhoto = { file: null, previewUrl: "", error: "" };

const closedDetail = {
  selectedId: null as number | null,
  detail: {
    status: "idle" as PublishedSpeciesState["detail"]["status"],
    data: null as SpeciesPublicationDetailDto | null,
    error: "",
    forbidden: false,
  },
  photo: idlePhoto,
  mode: "read" as const,
  baseline: null as SpeciesSheetDraft | null,
  draft: null as SpeciesSheetDraft | null,
  newPhoto: noNewPhoto,
  fieldErrors: {} as Record<string, string[]>,
  pendingAction: null as PublishedPendingAction,
  busy: false,
  dialogError: "",
};

export const initialPublishedSpeciesState: PublishedSpeciesState = {
  statusFilter: "",
  category: "",
  page: 1,
  list: { status: "loading", items: [], hasMore: false, error: "", forbidden: false },
  thumbs: {},
  ...closedDetail,
  notice: "",
};

export type PublishedSpeciesAction =
  | { type: "status-changed"; status: PublishedStatusFilter }
  | { type: "category-changed"; category: "" | SpeciesCategory }
  | { type: "page-changed"; page: number }
  | { type: "list-loading" }
  | { type: "list-loaded"; items: PublishedSpeciesRowDto[]; hasMore: boolean }
  | { type: "list-failed"; message: string; forbidden: boolean }
  | { type: "thumbs-reset" }
  | { type: "thumb-changed"; id: number; photo: PhotoSlot }
  | { type: "detail-opening"; id: number }
  | { type: "detail-closed" }
  | { type: "detail-loaded"; data: SpeciesPublicationDetailDto }
  | { type: "detail-failed"; message: string; forbidden: boolean; notFound: boolean }
  | { type: "photo-changed"; photo: PhotoSlot }
  | { type: "edit-started" }
  | { type: "edit-cancelled" }
  | { type: "draft-changed"; changes: Partial<SpeciesSheetDraft> }
  | { type: "new-photo-chosen"; file: File; previewUrl: string }
  | { type: "new-photo-rejected"; error: string }
  | { type: "new-photo-cleared" }
  | { type: "save-started" }
  | { type: "save-failed"; message: string; fieldErrors: Record<string, string[]> }
  | { type: "saved"; data: SpeciesPublicationDetailDto; notice: string }
  | { type: "action-opened"; action: Exclude<PublishedPendingAction, null> }
  | { type: "action-closed" }
  | { type: "action-started" }
  | { type: "action-failed"; message: string }
  | { type: "action-done"; notice: string }
  | { type: "removed"; notice: string }
  | { type: "notice-set"; notice: string }
  | { type: "notice-dismissed" };

const listLoading = (state: PublishedSpeciesState): PublishedSpeciesState["list"] => ({
  ...state.list,
  status: "loading",
  items: [],
  error: "",
  forbidden: false,
});

export function publishedSpeciesReducer(
  state: PublishedSpeciesState,
  action: PublishedSpeciesAction,
): PublishedSpeciesState {
  switch (action.type) {
    case "status-changed":
      return { ...state, statusFilter: action.status, page: 1, list: listLoading(state) };
    case "category-changed":
      return { ...state, category: action.category, page: 1, list: listLoading(state) };
    case "page-changed":
      return { ...state, page: action.page, list: listLoading(state) };
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
      // Sin filas anteriores como si fueran actuales (CA-58).
      return {
        ...state,
        thumbs: {},
        list: {
          status: "error",
          items: [],
          hasMore: false,
          error: action.message,
          forbidden: action.forbidden,
        },
      };
    case "thumbs-reset":
      return { ...state, thumbs: {} };
    case "thumb-changed":
      return { ...state, thumbs: { ...state.thumbs, [action.id]: action.photo } };
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
      return { ...state, photo: action.photo };
    case "edit-started": {
      const data = state.detail.data;

      if (!data) return state;

      const baseline = draftFromSheet(data);

      return {
        ...state,
        mode: "edit",
        baseline,
        draft: baseline,
        newPhoto: noNewPhoto,
        fieldErrors: {},
        dialogError: "",
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
        dialogError: "",
      };
    case "draft-changed":
      return state.draft
        ? { ...state, draft: { ...state.draft, ...action.changes }, fieldErrors: {} }
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
      return { ...state, busy: true, fieldErrors: {}, dialogError: "" };
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
    case "action-opened":
      return { ...state, pendingAction: action.action, dialogError: "" };
    case "action-closed":
      return state.busy ? state : { ...state, pendingAction: null, dialogError: "" };
    case "action-started":
      return { ...state, busy: true, dialogError: "" };
    case "action-failed":
      return { ...state, busy: false, dialogError: action.message };
    case "action-done":
      return { ...state, busy: false, pendingAction: null, dialogError: "", notice: action.notice };
    case "removed":
      return { ...state, ...closedDetail, notice: action.notice };
    case "notice-set":
      return { ...state, notice: action.notice };
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

/** Cambios sin guardar del formulario (CA-10): borrador distinto o foto elegida. */
export function publishedIsDirty(state: PublishedSpeciesState): boolean {
  return state.mode === "edit"
    ? sheetIsDirty(state.baseline, state.draft, state.newPhoto.file !== null)
    : false;
}

export type PublishedContext = {
  api: AdminApi;
  dispatch: (action: PublishedSpeciesAction) => void;
  preview: ImagePreview;
  getState: () => PublishedSpeciesState;
  isCurrent: () => boolean;
  /** Vuelve a pedir la lista tras un cambio de estado de una especie. */
  refreshList: () => void;
};

export const unpublishedNotice = "Especie despublicada. Ya no aparece en el catálogo público.";
export const republishedNotice = "Especie republicada. Ya es visible en el catálogo público.";
export const removedNotice =
  "La publicación se eliminó. Para publicarla de nuevo, el veterinario debe enviar una solicitud.";
export const publishedSavedNotice = "Cambios guardados. La especie sigue despublicada.";
export const republishPhotoHint = "Añade la foto con «Editar» antes de republicar.";
export const pendingRequestNotice =
  "Esta especie tiene una solicitud pendiente. Revísala en la pestaña Solicitudes.";
export const removeBlockNotice =
  "Esto elimina la foto y los datos publicados; la especie seguirá existiendo.";

export const unpublishDialogCopy: ConfirmationCopy = {
  title: "Despublicar especie",
  message:
    "¿Despublicar esta especie? Dejará de aparecer en el catálogo público. No se borra nada: la foto y los datos se conservan.",
  confirmLabel: "Confirmar",
  danger: false,
};

export const republishDialogCopy: ConfirmationCopy = {
  title: "Republicar especie",
  message:
    "¿Republicar esta especie? Volverá a aparecer en el catálogo público con su foto y sus datos guardados.",
  confirmLabel: "Confirmar",
  danger: false,
};

export const removeDialogCopy: ConfirmationCopy = {
  title: "¿Seguro que quieres eliminar la publicación?",
  message:
    "Esto eliminará la foto y los datos publicados de la especie y marcará sus solicitudes como eliminadas. La especie y sus animales seguirán existiendo.",
  confirmLabel: "Eliminar publicación",
  danger: true,
};

export function publishedDialogCopy(action: PublishedPendingAction): ConfirmationCopy | null {
  if (action === "unpublish") return unpublishDialogCopy;
  if (action === "republish") return republishDialogCopy;
  if (action === "remove") return removeDialogCopy;

  return null;
}

export async function loadPublishedList(
  ctx: PublishedContext,
  query: { status: PublishedStatusFilter; category: "" | SpeciesCategory; page: number },
): Promise<void> {
  releaseThumbs(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "thumbs-reset" });
  ctx.dispatch({ type: "list-loading" });

  try {
    // Los filtros viajan a la API; nunca se filtra en el cliente (CA-51).
    const page = await ctx.api.publishedSpecies.list({
      status: query.status || undefined,
      category: query.category || undefined,
      page: query.page,
    });

    if (!ctx.isCurrent()) return;

    ctx.dispatch({ type: "list-loaded", items: page.data, hasMore: page.meta.has_more });
    await loadThumbs(ctx, page.data);
  } catch (error) {
    const described = describeSpeciesError(error, "published");

    if (ctx.isCurrent() && !described.unauthorized) {
      ctx.dispatch({
        type: "list-failed",
        message: described.message,
        forbidden: described.forbidden,
      });
    }
  }
}

/** Revoca las miniaturas de la página actual (cambio de página y desmontaje). */
export function releaseThumbs(preview: ImagePreview, state: Pick<PublishedSpeciesState, "thumbs">) {
  for (const slot of Object.values(state.thumbs)) {
    if (slot.url) preview.revoke(slot.url);
  }
}

/** Miniatura solo si `has_image`; sin foto la fila muestra «Sin foto» (CA-51). */
async function loadThumbs(ctx: PublishedContext, rows: PublishedSpeciesRowDto[]): Promise<void> {
  await Promise.all(
    rows.map(async (row) => {
      if (!row.has_image) {
        ctx.dispatch({ type: "thumb-changed", id: row.id, photo: { status: "none", url: "" } });

        return;
      }

      ctx.dispatch({ type: "thumb-changed", id: row.id, photo: { status: "loading", url: "" } });

      try {
        const file = await ctx.api.publishedSpecies.image(row.id);

        if (!ctx.isCurrent()) return;

        ctx.dispatch({
          type: "thumb-changed",
          id: row.id,
          photo: { status: "ready", url: ctx.preview.create(file.blob as File) },
        });
      } catch {
        if (ctx.isCurrent()) {
          ctx.dispatch({ type: "thumb-changed", id: row.id, photo: { status: "error", url: "" } });
        }
      }
    }),
  );
}

function releasePhoto(ctx: PublishedContext) {
  const url = ctx.getState().photo.url;

  if (url) ctx.preview.revoke(url);
}

/** Revoca las URL `blob:` del detalle abierto. */
export function releasePublishedDetailUrls(
  preview: ImagePreview,
  state: Pick<PublishedSpeciesState, "photo" | "newPhoto">,
): void {
  for (const url of [state.photo.url, state.newPhoto.previewUrl]) {
    if (url) preview.revoke(url);
  }
}

async function loadPublishedPhoto(
  ctx: PublishedContext,
  detail: SpeciesPublicationDetailDto,
): Promise<void> {
  releasePhoto(ctx);

  if (!detail.has_image) {
    ctx.dispatch({ type: "photo-changed", photo: { status: "none", url: "" } });

    return;
  }

  ctx.dispatch({ type: "photo-changed", photo: { status: "loading", url: "" } });

  try {
    const file = await ctx.api.publishedSpecies.image(detail.id);

    if (!ctx.isCurrent()) return;

    ctx.dispatch({
      type: "photo-changed",
      photo: { status: "ready", url: ctx.preview.create(file.blob as File) },
    });
  } catch {
    if (ctx.isCurrent()) ctx.dispatch({ type: "photo-changed", photo: { status: "error", url: "" } });
  }
}

async function loadPublishedDetail(
  ctx: PublishedContext,
  id: number,
): Promise<SpeciesPublicationDetailDto | null> {
  try {
    const data = await ctx.api.publishedSpecies.get(id);

    if (!ctx.isCurrent()) return null;

    ctx.dispatch({ type: "detail-loaded", data });

    return data;
  } catch (error) {
    const described = describeSpeciesError(error, "published");

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

/** Abre una especie: revoca las URL anteriores, pide el detalle y después su foto. */
export async function openPublished(ctx: PublishedContext, id: number): Promise<void> {
  releasePublishedDetailUrls(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-opening", id });

  const detail = await loadPublishedDetail(ctx, id);

  if (detail && ctx.isCurrent()) await loadPublishedPhoto(ctx, detail);
}

export function closePublishedDetail(ctx: PublishedContext): void {
  releasePublishedDetailUrls(ctx.preview, ctx.getState());
  ctx.dispatch({ type: "detail-closed" });
}

/** Recarga la especie y su foto tras un 422 de estado (CA-53, CA-54, CA-57). */
export async function reloadPublished(ctx: PublishedContext, id: number): Promise<void> {
  const detail = await loadPublishedDetail(ctx, id);

  if (detail && ctx.isCurrent()) await loadPublishedPhoto(ctx, detail);
}

export function startPublishedEdit(ctx: PublishedContext): void {
  const data = ctx.getState().detail.data;
  const available = data ? publishedActions(data, false) : null;

  if (available?.canEdit && !available.editDisabled) ctx.dispatch({ type: "edit-started" });
}

export function cancelPublishedEdit(ctx: PublishedContext): void {
  const preview = ctx.getState().newPhoto.previewUrl;

  if (preview) ctx.preview.revoke(preview);
  ctx.dispatch({ type: "edit-cancelled" });
}

export function choosePublishedPhoto(ctx: PublishedContext, file: File): void {
  const error = validateSpeciesPhoto(file);

  if (error) {
    ctx.dispatch({ type: "new-photo-rejected", error });

    return;
  }

  const previous = ctx.getState().newPhoto.previewUrl;

  if (previous) ctx.preview.revoke(previous);
  ctx.dispatch({ type: "new-photo-chosen", file, previewUrl: ctx.preview.create(file) });
}

export function clearPublishedPhoto(ctx: PublishedContext): void {
  const previous = ctx.getState().newPhoto.previewUrl;

  if (previous) ctx.preview.revoke(previous);
  ctx.dispatch({ type: "new-photo-cleared" });
}

/**
 * Guarda la ficha de una especie despublicada con PATCH de solo los campos
 * cambiados (CA-55). Nunca publica. 422 por campo queda junto al campo; 422 de
 * estado recarga la especie.
 */
export async function savePublishedEdit(ctx: PublishedContext): Promise<boolean> {
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
    const data = await ctx.api.publishedSpecies.update(detail.id, built.input);

    if (!ctx.isCurrent()) return false;

    const preview = state.newPhoto.previewUrl;

    if (preview) ctx.preview.revoke(preview);
    ctx.dispatch({ type: "saved", data, notice: publishedSavedNotice });
    ctx.refreshList();
    if (sentPhoto) await loadPublishedPhoto(ctx, data);

    return true;
  } catch (error) {
    const described = describeSpeciesError(error, "published");

    if (!ctx.isCurrent() || described.unauthorized) return false;

    ctx.dispatch({
      type: "save-failed",
      message: described.message,
      fieldErrors: formFieldErrors(described.fieldErrors),
    });

    if (isStateConflict(described)) {
      cancelPublishedEdit(ctx);
      ctx.dispatch({ type: "notice-set", notice: described.message });
      await reloadPublished(ctx, detail.id);
    }

    return false;
  }
}

async function failAction(
  ctx: PublishedContext,
  id: number,
  error: unknown,
  hint: (message: string) => string = (message) => message,
): Promise<boolean> {
  const described = describeSpeciesError(error, "published");

  if (!ctx.isCurrent()) return false;

  if (described.unauthorized) {
    ctx.dispatch({ type: "action-closed" });

    return false;
  }

  if (isStateConflict(described)) {
    // 422 de estado: muestra el mensaje, cierra el diálogo y recarga (CA-53, CA-57).
    ctx.dispatch({ type: "action-done", notice: hint(described.message) });
    ctx.refreshList();
    await reloadPublished(ctx, id);

    return false;
  }

  ctx.dispatch({ type: "action-failed", message: described.message });

  return false;
}

/** Despublica solo al confirmar (CA-53); no depende de cambios sin guardar. */
export async function unpublishSpecies(ctx: PublishedContext): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || state.busy) return false;

  ctx.dispatch({ type: "action-started" });

  try {
    const data = await ctx.api.publishedSpecies.unpublish(detail.id);

    if (!ctx.isCurrent()) return false;

    ctx.dispatch({ type: "detail-loaded", data });
    ctx.dispatch({ type: "action-done", notice: unpublishedNotice });
    ctx.refreshList();

    return true;
  } catch (error) {
    return failAction(ctx, detail.id, error);
  }
}

/** Republica sin cuerpo (CA-54); con cambios sin guardar no llama a la API (CA-10). */
export async function republishSpecies(ctx: PublishedContext): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || state.busy || publishedIsDirty(state)) return false;

  ctx.dispatch({ type: "action-started" });

  try {
    const data = await ctx.api.publishedSpecies.republish(detail.id);

    if (!ctx.isCurrent()) return false;

    ctx.dispatch({ type: "detail-loaded", data });
    ctx.dispatch({ type: "action-done", notice: republishedNotice });
    ctx.refreshList();

    return true;
  } catch (error) {
    return failAction(ctx, detail.id, error, (message) =>
      /foto|datos publicados/i.test(message) ? `${message} ${republishPhotoHint}` : message,
    );
  }
}

/** Elimina la publicación solo al confirmar (CA-56); la especie sale de publicadas. */
export async function removePublication(ctx: PublishedContext): Promise<boolean> {
  const state = ctx.getState();
  const detail = state.detail.data;

  if (!detail || state.busy) return false;

  ctx.dispatch({ type: "action-started" });

  try {
    await ctx.api.publishedSpecies.removePublication(detail.id);

    if (!ctx.isCurrent()) return false;

    releasePublishedDetailUrls(ctx.preview, ctx.getState());
    ctx.dispatch({ type: "removed", notice: removedNotice });
    ctx.refreshList();

    return true;
  } catch (error) {
    return failAction(ctx, detail.id, error);
  }
}

export type PublishedActionAvailability = {
  canUnpublish: boolean;
  canEdit: boolean;
  /** «Editar» deshabilitado por solicitud pendiente (CA-57). */
  editDisabled: boolean;
  canRepublish: boolean;
  /** «Republicar» deshabilitado por solicitud pendiente o cambios sin guardar. */
  republishDisabled: boolean;
  canRemove: boolean;
  pendingNotice: string;
  saveFirstNotice: string;
};

/**
 * Qué botones se muestran, a partir de los flags de la API (`is_published`,
 * `unpublished_at`, `has_pending_request`). No se usa `publication_status`:
 * con solicitud pendiente la API lo devuelve como `pending` (RN-18). La
 * decisión de fondo la repite la API.
 */
export function publishedActions(
  detail: SpeciesPublicationDetailDto,
  dirty: boolean,
): PublishedActionAvailability {
  const published = detail.is_published;
  const unpublished = !detail.is_published && detail.unpublished_at !== null;
  const pending = detail.has_pending_request;

  return {
    canUnpublish: published,
    canEdit: unpublished || (pending && (published || unpublished)),
    editDisabled: pending,
    canRepublish: unpublished || (pending && (published || unpublished)),
    republishDisabled: pending || dirty,
    canRemove: published || unpublished,
    pendingNotice: pending && (published || unpublished) ? pendingRequestNotice : "",
    saveFirstNotice: unpublished && dirty ? SAVE_BEFORE_PUBLISH_NOTICE : "",
  };
}

export type PublishedSpeciesViewModel = {
  state: PublishedSpeciesState;
  dirty: boolean;
  actions: {
    changeStatus: (status: PublishedStatusFilter) => void;
    changeCategory: (category: "" | SpeciesCategory) => void;
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
    openAction: (action: Exclude<PublishedPendingAction, null>) => void;
    closeAction: () => void;
    confirmAction: () => void;
    dismissNotice: () => void;
  };
};
