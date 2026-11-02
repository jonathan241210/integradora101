import type { AdminApi, NewsDto, NewsInput } from "./admin-types";
import type { ConfirmationCopy } from "./confirmation";
import {
  initialManagedListState,
  loadManagedList,
  managedListReducer,
  runOperation,
  type ManagedListAction,
  type ManagedListState,
} from "./managed-list";

export type NewsDialog =
  | { kind: "create" }
  | { kind: "edit"; item: NewsDto }
  | { kind: "status"; item: NewsDto }
  | { kind: "delete"; item: NewsDto };

export type NewsState = ManagedListState<NewsDto, NewsDialog>;
export type NewsAction = ManagedListAction<NewsDto, NewsDialog>;
export type NewsDispatch = (action: NewsAction) => void;

export type NewsFormValues = {
  title: string;
  description: string;
  content: string;
  category: string;
  published_date: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export const initialNewsState: NewsState = initialManagedListState<NewsDto, NewsDialog>();

export function newsReducer(state: NewsState, action: NewsAction): NewsState {
  return managedListReducer(state, action);
}

export function emptyNewsForm(): NewsFormValues {
  return {
    title: "",
    description: "",
    content: "",
    category: "",
    published_date: "",
    start_date: "",
    end_date: "",
    is_active: true,
  };
}

export function newsFormFromDto(item: NewsDto): NewsFormValues {
  return {
    title: item.title,
    description: item.description ?? "",
    content: item.content,
    category: item.category,
    published_date: item.published_date?.slice(0, 10) ?? "",
    start_date: item.start_date?.slice(0, 10) ?? "",
    end_date: item.end_date?.slice(0, 10) ?? "",
    is_active: item.is_active,
  };
}

/** El estado solo se envía al crear; después cambia por su propio endpoint. */
export function toNewsInput(values: NewsFormValues, creating: boolean): NewsInput {
  const input: NewsInput = {
    title: values.title.trim(),
    description: values.description.trim() || null,
    content: values.content.trim(),
    category: values.category.trim(),
    published_date: values.published_date,
    start_date: values.start_date || null,
    end_date: values.end_date || null,
  };

  if (creating) input.is_active = values.is_active;

  return input;
}

export function getNewsConfirmation(
  dialog: NewsDialog | null,
): ConfirmationCopy | null {
  if (dialog?.kind === "status") {
    return dialog.item.is_active
      ? {
          title: "Desactivar noticia",
          message: `¿Desactivar la noticia «${dialog.item.title}»? Dejará de mostrarse en el portal público.`,
          confirmLabel: "Desactivar noticia",
          danger: true,
        }
      : {
          title: "Activar noticia",
          message: `¿Activar la noticia «${dialog.item.title}»? Volverá a mostrarse en el portal público.`,
          confirmLabel: "Activar noticia",
          danger: false,
        };
  }

  if (dialog?.kind === "delete") {
    return {
      title: "Eliminar noticia",
      message: `¿Eliminar la noticia «${dialog.item.title}»? Dejará de aparecer en la lista y en el portal público.`,
      confirmLabel: "Eliminar noticia",
      danger: true,
    };
  }

  return null;
}

export function loadNews(
  api: AdminApi,
  dispatch: NewsDispatch,
  silent = false,
): Promise<void> {
  return loadManagedList(dispatch, () => api.news.list(), silent);
}

export function saveNews(
  api: AdminApi,
  dispatch: NewsDispatch,
  dialog: NewsDialog | null,
  values: NewsFormValues,
): Promise<boolean> {
  const reload = () => loadNews(api, dispatch, true);

  if (dialog?.kind === "create") {
    return runOperation(
      dispatch,
      () => api.news.create(toNewsInput(values, true)),
      "La noticia se creó correctamente.",
      reload,
    );
  }

  if (dialog?.kind === "edit") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.news.update(item.id, toNewsInput(values, false)),
      "Los cambios de la noticia se guardaron.",
      reload,
    );
  }

  return Promise.resolve(false);
}

export function confirmNewsDialog(
  api: AdminApi,
  dispatch: NewsDispatch,
  dialog: NewsDialog | null,
): Promise<boolean> {
  const reload = () => loadNews(api, dispatch, true);

  if (dialog?.kind === "status") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.news.setStatus(item.id, !item.is_active),
      item.is_active ? "La noticia se desactivó." : "La noticia se activó.",
      reload,
    );
  }

  if (dialog?.kind === "delete") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.news.remove(item.id),
      "La noticia se eliminó.",
      reload,
    );
  }

  return Promise.resolve(false);
}

export type NewsViewModel = {
  state: NewsState;
  actions: {
    reload: () => void;
    openDialog: (dialog: NewsDialog) => void;
    closeDialog: () => void;
    dismissNotice: () => void;
    save: (values: NewsFormValues) => void;
    confirm: () => void;
  };
};
