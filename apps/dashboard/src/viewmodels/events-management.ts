import type { AdminApi, EventDto, EventInput } from "./admin-types";
import { formatTime } from "./formatters";
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

export type EventsState = ContentState<EventDto, EventFormValues>;
export type EventsAction = ContentAction<EventDto, EventFormValues>;
export type EventsDispatch = (action: EventsAction) => void;
export type EventsViewModel = ContentViewModel<EventDto, EventFormValues>;

export type EventFormValues = {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  image: ImageValue;
};

export function emptyEventForm(): EventFormValues {
  return {
    name: "",
    description: "",
    location: "",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    is_active: true,
    image: emptyImage(),
  };
}

export function eventFormFromDto(item: EventDto): EventFormValues {
  return {
    name: item.name,
    description: item.description ?? "",
    location: item.location ?? "",
    start_date: item.start_date?.slice(0, 10) ?? "",
    end_date: item.end_date?.slice(0, 10) ?? "",
    start_time: formatTime(item.start_time),
    end_time: formatTime(item.end_time),
    is_active: item.is_active,
    image: emptyImage(),
  };
}

/**
 * El estado solo se envía al crear; después cambia por su propio endpoint.
 * `@arca/api-client` decide si va JSON o `multipart/form-data`.
 */
export function toEventInput(values: EventFormValues, creating: boolean): EventInput {
  const input: EventInput = {
    name: values.name.trim(),
    description: values.description.trim() || null,
    location: values.location.trim() || null,
    start_date: values.start_date,
    end_date: values.end_date || null,
    start_time: values.start_time || null,
    end_time: values.end_time || null,
  };

  if (creating) input.is_active = values.is_active;
  if (values.image.file) input.image = values.image.file;
  else if (!creating && values.image.removeImage) input.remove_image = true;

  return input;
}

export const eventsConfig: ContentConfig<EventDto, EventFormValues, EventInput> = {
  resource: (api) => api.events,
  emptyForm: emptyEventForm,
  formFromItem: eventFormFromDto,
  toInput: toEventInput,
  notices: {
    created: "El evento se creó correctamente.",
    updated: "Los cambios del evento se guardaron.",
    activated: "El evento se activó.",
    deactivated: "El evento se desactivó.",
    deleted: "El evento se eliminó.",
  },
};

export const initialEventsState: EventsState = initialContentState<EventDto, EventFormValues>(
  emptyEventForm(),
);

export const eventsReducer = contentReducer<EventDto, EventFormValues>;

export function loadEvents(api: AdminApi, dispatch: EventsDispatch, silent = false): Promise<void> {
  return loadContent(eventsConfig, api, dispatch, silent);
}

export function saveEvent(
  api: AdminApi,
  dispatch: EventsDispatch,
  state: EventsState,
  preview: ImagePreview,
): Promise<boolean> {
  return saveContent(eventsConfig, api, dispatch, state, preview);
}

export function confirmEventAction(
  api: AdminApi,
  dispatch: EventsDispatch,
  state: EventsState,
  preview: ImagePreview,
): Promise<boolean> {
  return confirmContentAction(eventsConfig, api, dispatch, state, preview);
}

export function getEventConfirmation(
  type: PendingActionType,
  item: EventDto,
): InlineConfirmCopy | null {
  if (type === "status") {
    return item.is_active
      ? {
          label: `Confirmar desactivar el evento ${item.name}`,
          message: `¿Desactivar el evento «${item.name}»? Dejará de mostrarse en el portal público.`,
          confirmLabel: "Confirmar",
          danger: true,
        }
      : {
          label: `Confirmar activar el evento ${item.name}`,
          message: `¿Activar el evento «${item.name}»? Volverá a mostrarse en el portal público.`,
          confirmLabel: "Confirmar",
          danger: false,
        };
  }

  if (type === "delete") {
    return {
      label: `Confirmar eliminar el evento ${item.name}`,
      message: `¿Eliminar el evento «${item.name}»? Se eliminará, dejará de mostrarse en la lista y en el portal público${item.image_url ? ", y su imagen se borrará del servidor" : ""}.`,
      confirmLabel: "Confirmar",
      danger: true,
    };
  }

  return null;
}
