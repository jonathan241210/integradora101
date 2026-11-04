import type { AdminApi } from "./admin-types";
import {
  dropImage,
  releaseImage,
  selectImage,
  type ImagePreview,
  type ImageValue,
} from "./image-field";
import {
  initialInlineListState,
  inlineListReducer,
  loadInlineList,
  runInlineOperation,
  type InlineConfirmCopy,
  type InlineListAction,
  type InlineListDispatch,
  type InlineListState,
  type PendingAction,
} from "./inline-list";

/**
 * Motor compartido por Noticias y Eventos (dashboard-004): formulario fijo,
 * imagen opcional con vista previa local y acciones en línea. Cada sección
 * aporta su `ContentConfig`; aquí no hay reglas de negocio (RN-05).
 */

export type ContentItem = { id: number; is_active: boolean; image_url: string | null };

export type ContentResource<Item, Input> = {
  list(): Promise<Item[]>;
  create(input: Input): Promise<Item>;
  update(id: number, input: Input): Promise<Item>;
  setStatus(id: number, isActive: boolean): Promise<void>;
  remove(id: number): Promise<void>;
};

export type ContentConfig<Item extends ContentItem, Form extends { image: ImageValue }, Input> = {
  resource: (api: AdminApi) => ContentResource<Item, Input>;
  emptyForm: () => Form;
  formFromItem: (item: Item) => Form;
  toInput: (form: Form, creating: boolean) => Input;
  notices: {
    created: string;
    updated: string;
    activated: string;
    deactivated: string;
    deleted: string;
  };
};

export type ContentState<Item, Form> = InlineListState<Item, Form>;
export type ContentAction<Item, Form> = InlineListAction<Item, Form>;
export type ContentDispatch<Item, Form> = InlineListDispatch<Item, Form>;

export type ContentViewModel<Item, Form> = {
  state: ContentState<Item, Form>;
  actions: {
    reload: () => void;
    dismissNotice: () => void;
    toggleForm: () => void;
    changeForm: (changes: Partial<Form>) => void;
    chooseImage: (file: File) => void;
    removeImage: () => void;
    startEdit: (item: Item) => void;
    cancelEdit: () => void;
    submit: () => void;
    openAction: (action: PendingAction) => void;
    closeAction: () => void;
    confirmAction: () => void;
  };
};

export function initialContentState<Item, Form>(form: Form): ContentState<Item, Form> {
  return initialInlineListState<Item, Form>(form);
}

export const contentReducer = inlineListReducer;

export function loadContent<Item extends ContentItem, Form extends { image: ImageValue }, Input>(
  config: ContentConfig<Item, Form, Input>,
  api: AdminApi,
  dispatch: ContentDispatch<Item, Form>,
  silent = false,
): Promise<void> {
  return loadInlineList(dispatch, () => config.resource(api).list(), silent);
}

export function chooseContentImage<Item, Form extends { image: ImageValue }>(
  state: ContentState<Item, Form>,
  dispatch: ContentDispatch<Item, Form>,
  preview: ImagePreview,
  file: File,
): void {
  const image = selectImage(state.form.image, file, preview);

  dispatch({ type: "form-changed", changes: { image } as unknown as Partial<Form> });
  // Un archivo válido sustituye el error 422 anterior del campo imagen.
  if (!image.error) dispatch({ type: "field-error-cleared", field: "image" });
}

export function removeContentImage<Item extends ContentItem, Form extends { image: ImageValue }>(
  state: ContentState<Item, Form>,
  dispatch: ContentDispatch<Item, Form>,
  preview: ImagePreview,
): void {
  dispatch({
    type: "form-changed",
    changes: {
      image: dropImage(state.form.image, Boolean(state.editing?.image_url), preview),
    } as unknown as Partial<Form>,
  });
  dispatch({ type: "field-error-cleared", field: "image" });
}

export function startContentEdit<Item extends ContentItem, Form extends { image: ImageValue }, Input>(
  config: ContentConfig<Item, Form, Input>,
  state: ContentState<Item, Form>,
  dispatch: ContentDispatch<Item, Form>,
  preview: ImagePreview,
  item: Item,
): void {
  releaseImage(state.form.image, preview);
  dispatch({ type: "edit-started", item, form: config.formFromItem(item) });
}

export function cancelContentEdit<Item extends ContentItem, Form extends { image: ImageValue }, Input>(
  config: ContentConfig<Item, Form, Input>,
  state: ContentState<Item, Form>,
  dispatch: ContentDispatch<Item, Form>,
  preview: ImagePreview,
): void {
  releaseImage(state.form.image, preview);
  dispatch({ type: "edit-cancelled", form: config.emptyForm() });
}

/** Alta o edición según `state.editing`; devuelve `true` si la API aceptó. */
export async function saveContent<Item extends ContentItem, Form extends { image: ImageValue }, Input>(
  config: ContentConfig<Item, Form, Input>,
  api: AdminApi,
  dispatch: ContentDispatch<Item, Form>,
  state: ContentState<Item, Form>,
  preview: ImagePreview,
): Promise<boolean> {
  // Doble envío: con una petición del formulario en curso no se lanza otra.
  if (state.saving) return false;

  const resource = config.resource(api);
  const { editing, form } = state;
  const input = config.toInput(form, editing === null);

  const saved = await runInlineOperation(
    dispatch,
    () => (editing ? resource.update(editing.id, input) : resource.create(input)),
    {
      notice: editing ? config.notices.updated : config.notices.created,
      scope: "form",
      resetForm: config.emptyForm(),
      reload: () => loadContent(config, api, dispatch, true),
    },
  );

  if (saved) releaseImage(form.image, preview);

  return saved;
}

/** Ejecuta la acción en línea abierta (`state.pendingAction`). */
export async function confirmContentAction<
  Item extends ContentItem,
  Form extends { image: ImageValue },
  Input,
>(
  config: ContentConfig<Item, Form, Input>,
  api: AdminApi,
  dispatch: ContentDispatch<Item, Form>,
  state: ContentState<Item, Form>,
  preview: ImagePreview,
): Promise<boolean> {
  const action = state.pendingAction;
  const item = state.items.find((candidate) => candidate.id === action?.id);

  if (!action || !item || state.actionBusy) return false;

  const resource = config.resource(api);
  const wasEditing = state.editing?.id === item.id;
  let operation: () => Promise<unknown>;
  let notice: string;

  if (action.type === "status") {
    operation = () => resource.setStatus(item.id, !item.is_active);
    notice = item.is_active ? config.notices.deactivated : config.notices.activated;
  } else if (action.type === "delete") {
    operation = () => resource.remove(item.id);
    notice = config.notices.deleted;
  } else {
    return false;
  }

  const done = await runInlineOperation(dispatch, operation, {
    notice,
    scope: "action",
    resetForm: wasEditing ? config.emptyForm() : null,
    reload: () => loadContent(config, api, dispatch, true),
  });

  if (done && wasEditing) releaseImage(state.form.image, preview);

  return done;
}

/** Imagen que se muestra en la caja: archivo nuevo, imagen guardada o ninguna. */
export function visibleImageUrl<Item extends ContentItem>(
  editing: Item | null,
  image: ImageValue,
): string {
  if (image.file) return image.previewUrl;
  if (image.removeImage) return "";

  return editing?.image_url ?? "";
}

/**
 * Limpieza al salir de la sección: libera la vista previa en curso (RN-04).
 * Lee el estado más reciente en el momento de salir, no el del montaje.
 */
export function createExitRelease<Form extends { image: ImageValue }>(
  latest: () => { form: Form },
  preview: ImagePreview,
): () => void {
  return () => releaseImage(latest().form.image, preview);
}

export function buildContentActions<Item extends ContentItem, Form extends { image: ImageValue }, Input>(
  config: ContentConfig<Item, Form, Input>,
  api: AdminApi,
  preview: ImagePreview,
  state: ContentState<Item, Form>,
  dispatch: ContentDispatch<Item, Form>,
): ContentViewModel<Item, Form>["actions"] {
  return {
    reload: () => void loadContent(config, api, dispatch),
    dismissNotice: () => dispatch({ type: "notice-dismissed" }),
    toggleForm: () => dispatch({ type: "panel-toggled" }),
    changeForm: (changes) => dispatch({ type: "form-changed", changes }),
    chooseImage: (file) => chooseContentImage(state, dispatch, preview, file),
    removeImage: () => removeContentImage(state, dispatch, preview),
    startEdit: (item) => startContentEdit(config, state, dispatch, preview, item),
    cancelEdit: () => cancelContentEdit(config, state, dispatch, preview),
    submit: () => void saveContent(config, api, dispatch, state, preview),
    openAction: (action) => dispatch({ type: "action-opened", action }),
    closeAction: () => dispatch({ type: "action-closed" }),
    confirmAction: () => void confirmContentAction(config, api, dispatch, state, preview),
  };
}

export type { InlineConfirmCopy };
