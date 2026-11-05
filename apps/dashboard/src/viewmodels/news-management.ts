import type { AdminApi, NewsDto, NewsInput } from "./admin-types";
import { emptyImage, type ImagePreview, type ImageValue } from "./image-field";
import {
  confirmContentAction,
  contentReducer,
  initialContentState,
  loadContent,
  saveContent,
  type ContentAction,
  type ContentConfig,
  type ContentState,
  type ContentViewModel,
} from "./inline-content";
import type { InlineConfirmCopy, PendingActionType } from "./inline-list";

export type NewsState = ContentState<NewsDto, NewsFormValues>;
export type NewsAction = ContentAction<NewsDto, NewsFormValues>;
export type NewsDispatch = (action: NewsAction) => void;
export type NewsViewModel = ContentViewModel<NewsDto, NewsFormValues>;

export type NewsFormValues = {
  title: string;
  description: string;
  content: string;
  category: string;
  published_date: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  image: ImageValue;
};

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
    image: emptyImage(),
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
    image: emptyImage(),
  };
}

/**
 * El estado solo se envía al crear; después cambia por su propio endpoint.
 * `@arca/api-client` decide si va JSON o `multipart/form-data`.
 */
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
  if (values.image.file) input.image = values.image.file;
  else if (!creating && values.image.removeImage) input.remove_image = true;

  return input;
}

export const newsConfig: ContentConfig<NewsDto, NewsFormValues, NewsInput> = {
  resource: (api) => api.news,
  emptyForm: emptyNewsForm,
  formFromItem: newsFormFromDto,
  toInput: toNewsInput,
  notices: {
    created: "La noticia se creó correctamente.",
    updated: "Los cambios de la noticia se guardaron.",
    activated: "La noticia se activó.",
    deactivated: "La noticia se desactivó.",
    deleted: "La noticia se eliminó.",
  },
};

export const initialNewsState: NewsState = initialContentState<NewsDto, NewsFormValues>(emptyNewsForm());

export const newsReducer = contentReducer<NewsDto, NewsFormValues>;

export function loadNews(api: AdminApi, dispatch: NewsDispatch, silent = false): Promise<void> {
  return loadContent(newsConfig, api, dispatch, silent);
}

export function saveNews(
  api: AdminApi,
  dispatch: NewsDispatch,
  state: NewsState,
  preview: ImagePreview,
): Promise<boolean> {
  return saveContent(newsConfig, api, dispatch, state, preview);
}

export function confirmNewsAction(
  api: AdminApi,
  dispatch: NewsDispatch,
  state: NewsState,
  preview: ImagePreview,
): Promise<boolean> {
  return confirmContentAction(newsConfig, api, dispatch, state, preview);
}

export function getNewsConfirmation(
  type: PendingActionType,
  item: NewsDto,
): InlineConfirmCopy | null {
  if (type === "status") {
    return item.is_active
      ? {
          label: `Confirmar desactivar la noticia ${item.title}`,
          message: `¿Desactivar la noticia «${item.title}»? Dejará de mostrarse en el portal público.`,
          confirmLabel: "Confirmar",
          danger: true,
        }
      : {
          label: `Confirmar activar la noticia ${item.title}`,
          message: `¿Activar la noticia «${item.title}»? Volverá a mostrarse en el portal público.`,
          confirmLabel: "Confirmar",
          danger: false,
        };
  }

  if (type === "delete") {
    return {
      label: `Confirmar eliminar la noticia ${item.title}`,
      message: `¿Eliminar la noticia «${item.title}»? Se eliminará, dejará de mostrarse en la lista y en el portal público${item.image_url ? ", y su imagen se borrará del servidor" : ""}.`,
      confirmLabel: "Confirmar",
      danger: true,
    };
  }

  return null;
}
