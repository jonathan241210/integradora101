import type { AdminApi, EventDto, EventInput } from "./admin-types";
import type { ConfirmationCopy } from "./confirmation";
import { formatTime } from "./formatters";
import {
  initialManagedListState,
  loadManagedList,
  managedListReducer,
  runOperation,
  type ManagedListAction,
  type ManagedListState,
} from "./managed-list";

export type EventDialog =
  | { kind: "create" }
  | { kind: "edit"; item: EventDto }
  | { kind: "status"; item: EventDto }
  | { kind: "delete"; item: EventDto };

export type EventsState = ManagedListState<EventDto, EventDialog>;
export type EventsAction = ManagedListAction<EventDto, EventDialog>;
export type EventsDispatch = (action: EventsAction) => void;

export type EventFormValues = {
  name: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
};

export const initialEventsState: EventsState = initialManagedListState<EventDto, EventDialog>();

export function eventsReducer(state: EventsState, action: EventsAction): EventsState {
  return managedListReducer(state, action);
}

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
  };
}

/** El estado solo se envía al crear; después cambia por su propio endpoint. */
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

  return input;
}

export function getEventConfirmation(
  dialog: EventDialog | null,
): ConfirmationCopy | null {
  if (dialog?.kind === "status") {
    return dialog.item.is_active
      ? {
          title: "Desactivar evento",
          message: `¿Desactivar el evento «${dialog.item.name}»? Dejará de mostrarse en el portal público.`,
          confirmLabel: "Desactivar evento",
          danger: true,
        }
      : {
          title: "Activar evento",
          message: `¿Activar el evento «${dialog.item.name}»? Volverá a mostrarse en el portal público.`,
          confirmLabel: "Activar evento",
          danger: false,
        };
  }

  if (dialog?.kind === "delete") {
    return {
      title: "Eliminar evento",
      message: `¿Eliminar el evento «${dialog.item.name}»? Dejará de aparecer en la lista y en el portal público.`,
      confirmLabel: "Eliminar evento",
      danger: true,
    };
  }

  return null;
}

export function loadEvents(
  api: AdminApi,
  dispatch: EventsDispatch,
  silent = false,
): Promise<void> {
  return loadManagedList(dispatch, () => api.events.list(), silent);
}

export function saveEvent(
  api: AdminApi,
  dispatch: EventsDispatch,
  dialog: EventDialog | null,
  values: EventFormValues,
): Promise<boolean> {
  const reload = () => loadEvents(api, dispatch, true);

  if (dialog?.kind === "create") {
    return runOperation(
      dispatch,
      () => api.events.create(toEventInput(values, true)),
      "El evento se creó correctamente.",
      reload,
    );
  }

  if (dialog?.kind === "edit") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.events.update(item.id, toEventInput(values, false)),
      "Los cambios del evento se guardaron.",
      reload,
    );
  }

  return Promise.resolve(false);
}

export function confirmEventDialog(
  api: AdminApi,
  dispatch: EventsDispatch,
  dialog: EventDialog | null,
): Promise<boolean> {
  const reload = () => loadEvents(api, dispatch, true);

  if (dialog?.kind === "status") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.events.setStatus(item.id, !item.is_active),
      item.is_active ? "El evento se desactivó." : "El evento se activó.",
      reload,
    );
  }

  if (dialog?.kind === "delete") {
    const { item } = dialog;

    return runOperation(
      dispatch,
      () => api.events.remove(item.id),
      "El evento se eliminó.",
      reload,
    );
  }

  return Promise.resolve(false);
}

export type EventsViewModel = {
  state: EventsState;
  actions: {
    reload: () => void;
    openDialog: (dialog: EventDialog) => void;
    closeDialog: () => void;
    dismissNotice: () => void;
    save: (values: EventFormValues) => void;
    confirm: () => void;
  };
};
