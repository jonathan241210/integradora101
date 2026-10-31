import { describeApiError } from "./api-errors";

/**
 * Estado y reducer comunes de las secciones de administración con lista,
 * diálogos y avisos (Usuarios, Noticias, Eventos y Recintos). No contiene
 * reglas de negocio: solo qué se muestra y qué mensaje devolvió la API.
 */

export type ListStatus = "loading" | "ready" | "empty" | "error";

export type FieldErrors = Record<string, string[]>;

export type ManagedListState<Item, Dialog> = {
  status: ListStatus;
  items: Item[];
  /** Error de carga de la lista (con reintento). */
  error: string;
  /** Aviso de éxito (`role="status"`). */
  notice: string;
  /** Error 403/404/422 de una operación (`role="alert"`). */
  actionError: string;
  fieldErrors: FieldErrors;
  dialog: Dialog | null;
  saving: boolean;
};

export type ManagedListAction<Item, Dialog> =
  | { type: "load-started" }
  | { type: "loaded"; items: Item[] }
  | { type: "load-failed"; message: string }
  | { type: "refresh-failed"; message: string }
  | { type: "dialog-opened"; dialog: Dialog }
  | { type: "dialog-closed" }
  | { type: "save-started" }
  | { type: "save-failed"; message: string; fieldErrors: FieldErrors }
  | { type: "saved"; notice: string }
  | { type: "notice-dismissed" };

export type ManagedListDispatch<Item, Dialog> = (
  action: ManagedListAction<Item, Dialog>,
) => void;

export function initialManagedListState<Item, Dialog>(): ManagedListState<
  Item,
  Dialog
> {
  return {
    status: "loading",
    items: [],
    error: "",
    notice: "",
    actionError: "",
    fieldErrors: {},
    dialog: null,
    saving: false,
  };
}

export function managedListReducer<Item, Dialog>(
  state: ManagedListState<Item, Dialog>,
  action: ManagedListAction<Item, Dialog>,
): ManagedListState<Item, Dialog> {
  switch (action.type) {
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return {
        ...state,
        status: action.items.length === 0 ? "empty" : "ready",
        items: action.items,
        error: "",
      };
    case "load-failed":
      return { ...state, status: "error", error: action.message };
    case "refresh-failed":
      return { ...state, actionError: action.message };
    case "dialog-opened":
      return {
        ...state,
        dialog: action.dialog,
        actionError: "",
        fieldErrors: {},
        notice: "",
        saving: false,
      };
    case "dialog-closed":
      return {
        ...state,
        dialog: null,
        actionError: "",
        fieldErrors: {},
        saving: false,
      };
    case "save-started":
      return { ...state, saving: true, actionError: "", fieldErrors: {} };
    case "save-failed":
      return {
        ...state,
        saving: false,
        actionError: action.message,
        fieldErrors: action.fieldErrors,
      };
    case "saved":
      return {
        ...state,
        saving: false,
        dialog: null,
        actionError: "",
        fieldErrors: {},
        notice: action.notice,
      };
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

/** Atiende un error de carga; el 401 lo resuelve el manejador global. */
export function reportLoadError<Item, Dialog>(
  dispatch: ManagedListDispatch<Item, Dialog>,
  error: unknown,
  silent: boolean,
): void {
  const described = describeApiError(error);

  if (described.unauthorized) return;

  dispatch(
    silent
      ? {
          type: "refresh-failed",
          message: "Los cambios se guardaron, pero no fue posible actualizar la lista.",
        }
      : { type: "load-failed", message: described.message },
  );
}

export async function loadManagedList<Item, Dialog>(
  dispatch: ManagedListDispatch<Item, Dialog>,
  fetchItems: () => Promise<Item[]>,
  silent = false,
): Promise<void> {
  if (!silent) dispatch({ type: "load-started" });

  try {
    dispatch({ type: "loaded", items: await fetchItems() });
  } catch (error) {
    reportLoadError(dispatch, error, silent);
  }
}

/**
 * Ejecuta una operación de escritura: marca el guardado, traduce 403/404/422
 * a mensajes sin tocar la lista y, si funcionó, confirma y recarga.
 * Devuelve `true` solo cuando la API aceptó la operación.
 */
export async function runOperation<Item, Dialog>(
  dispatch: ManagedListDispatch<Item, Dialog>,
  operation: () => Promise<unknown>,
  successNotice: string,
  reload: () => Promise<void>,
): Promise<boolean> {
  dispatch({ type: "save-started" });

  try {
    await operation();
  } catch (error) {
    const described = describeApiError(error);

    dispatch({
      type: "save-failed",
      message: described.unauthorized ? "" : described.message,
      fieldErrors: described.unauthorized ? {} : described.fieldErrors,
    });

    return false;
  }

  dispatch({ type: "saved", notice: successNotice });
  await reload();

  return true;
}
