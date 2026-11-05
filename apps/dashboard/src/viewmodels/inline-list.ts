import { describeApiError } from "./api-errors";
import type { FieldErrors, ListStatus } from "./managed-list";

/**
 * Estado y reducer comunes de Noticias, Eventos y Usuarios con formulario fijo
 * en la página y confirmaciones en línea (dashboard-004). Sin reglas de
 * negocio: solo qué se muestra y qué devolvió la API.
 */

export type PendingActionType = "delete" | "status" | "reset-password" | "reset-two-factor";

/** Acción en línea abierta; solo una a la vez por sección (CA-12). */
export type PendingAction = { type: PendingActionType; id: number };

export type InlineListState<Item, Form> = {
  status: ListStatus;
  items: Item[];
  /** Error de carga de la lista (con reintento). */
  error: string;
  /** Aviso de éxito (`role="status"`). */
  notice: string;
  /** Error 403/404/red de una acción en línea o de la recarga (`role="alert"`). */
  actionError: string;
  /** Error general del formulario al guardar. */
  formError: string;
  /** Errores 422 por campo del formulario fijo. */
  fieldErrors: FieldErrors;
  /** Errores 422 por campo de la acción en línea abierta (p. ej. nueva contraseña). */
  actionFieldErrors: FieldErrors;
  /** Petición del formulario en curso. */
  saving: boolean;
  /** Petición de la acción en línea en curso; independiente de `saving`. */
  actionBusy: boolean;
  /** Registro cargado en el formulario; `null` es el modo de alta. */
  editing: Item | null;
  pendingAction: PendingAction | null;
  /** Panel del formulario expandido (RN-11): expandido al abrir, sin persistir. */
  formExpanded: boolean;
  form: Form;
};

export type InlineListAction<Item, Form> =
  | { type: "load-started" }
  | { type: "loaded"; items: Item[] }
  | { type: "load-failed"; message: string }
  | { type: "refresh-failed"; message: string }
  | { type: "form-changed"; changes: Partial<Form> }
  | { type: "edit-started"; item: Item; form: Form }
  | { type: "edit-cancelled"; form: Form }
  | { type: "action-opened"; action: PendingAction }
  | { type: "action-closed" }
  | { type: "panel-toggled" }
  | { type: "save-started"; scope: OperationScope }
  | { type: "save-failed"; scope: OperationScope; message: string; fieldErrors: FieldErrors }
  /** `resetForm` no nulo devuelve el formulario al modo de alta (CA-13). */
  | { type: "saved"; scope: OperationScope; notice: string; resetForm: Form | null }
  /** Quita los errores 422 de un campo del formulario (p. ej. `image` al elegir un archivo válido). */
  | { type: "field-error-cleared"; field: string }
  | { type: "notice-dismissed" };

/** Una petición pertenece al formulario o a una acción en línea; cada una tiene su propio ocupado. */
export type OperationScope = "form" | "action";

export type InlineListDispatch<Item, Form> = (action: InlineListAction<Item, Form>) => void;

export function initialInlineListState<Item, Form>(form: Form): InlineListState<Item, Form> {
  return {
    status: "loading",
    items: [],
    error: "",
    notice: "",
    actionError: "",
    formError: "",
    fieldErrors: {},
    actionFieldErrors: {},
    saving: false,
    actionBusy: false,
    editing: null,
    pendingAction: null,
    formExpanded: true,
    form,
  };
}

export function inlineListReducer<Item, Form>(
  state: InlineListState<Item, Form>,
  action: InlineListAction<Item, Form>,
): InlineListState<Item, Form> {
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
    case "form-changed":
      return { ...state, form: { ...state.form, ...action.changes } };
    case "edit-started":
      // Con el formulario guardando no se cambia de registro: la respuesta lo pisaría.
      if (state.saving) return state;

      return {
        ...state,
        editing: action.item,
        form: action.form,
        formExpanded: true,
        // Una acción en curso conserva su confirmación hasta responder.
        pendingAction: state.actionBusy ? state.pendingAction : null,
        formError: "",
        actionError: state.actionBusy ? state.actionError : "",
        actionFieldErrors: state.actionBusy ? state.actionFieldErrors : {},
        fieldErrors: {},
        notice: "",
      };
    case "edit-cancelled":
      if (state.saving) return state;

      return {
        ...state,
        editing: null,
        form: action.form,
        formError: "",
        fieldErrors: {},
      };
    case "action-opened":
      if (state.actionBusy) return state;

      return {
        ...state,
        pendingAction: action.action,
        actionError: "",
        actionFieldErrors: {},
        notice: "",
      };
    case "action-closed":
      if (state.actionBusy) return state;

      return { ...state, pendingAction: null, actionError: "", actionFieldErrors: {} };
    case "panel-toggled":
      return { ...state, formExpanded: !state.formExpanded };
    case "save-started":
      return action.scope === "form"
        ? { ...state, saving: true, formError: "", fieldErrors: {} }
        : { ...state, actionBusy: true, actionError: "", actionFieldErrors: {} };
    case "save-failed":
      return action.scope === "form"
        ? {
            ...state,
            saving: false,
            formError: action.message,
            fieldErrors: action.fieldErrors,
          }
        : {
            ...state,
            actionBusy: false,
            actionError: action.message,
            actionFieldErrors: action.fieldErrors,
          };
    case "saved": {
      const reset = action.resetForm
        ? { editing: null, form: action.resetForm, formError: "", fieldErrors: {} }
        : {};

      return {
        ...state,
        ...(action.scope === "form" ? { saving: false } : { actionBusy: false }),
        pendingAction: null,
        actionError: "",
        actionFieldErrors: {},
        ...(action.scope === "form" ? { formError: "", fieldErrors: {} } : {}),
        notice: action.notice,
        ...reset,
      };
    }
    case "field-error-cleared": {
      const { [action.field]: _removed, ...rest } = state.fieldErrors;

      return { ...state, fieldErrors: rest };
    }
    case "notice-dismissed":
      return { ...state, notice: "" };
    default:
      return state;
  }
}

/** Atiende un error de carga; el 401 lo resuelve el manejador global. */
export function reportInlineLoadError<Item, Form>(
  dispatch: InlineListDispatch<Item, Form>,
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

export async function loadInlineList<Item, Form>(
  dispatch: InlineListDispatch<Item, Form>,
  fetchItems: () => Promise<Item[]>,
  silent = false,
): Promise<void> {
  if (!silent) dispatch({ type: "load-started" });

  try {
    dispatch({ type: "loaded", items: await fetchItems() });
  } catch (error) {
    reportInlineLoadError(dispatch, error, silent);
  }
}

/**
 * Ejecuta una operación de escritura: marca el guardado, traduce 403/404/422
 * sin tocar la lista ni el formulario y, si funcionó, confirma y recarga.
 * Devuelve `true` solo cuando la API aceptó la operación.
 */
export async function runInlineOperation<Item, Form>(
  dispatch: InlineListDispatch<Item, Form>,
  operation: () => Promise<unknown>,
  options: {
    notice: string;
    scope: OperationScope;
    resetForm: Form | null;
    reload: () => Promise<void>;
  },
): Promise<boolean> {
  dispatch({ type: "save-started", scope: options.scope });

  try {
    await operation();
  } catch (error) {
    const described = describeApiError(error);

    dispatch({
      type: "save-failed",
      scope: options.scope,
      message: described.unauthorized ? "" : described.message,
      fieldErrors: described.unauthorized ? {} : described.fieldErrors,
    });

    return false;
  }

  dispatch({
    type: "saved",
    scope: options.scope,
    notice: options.notice,
    resetForm: options.resetForm,
  });
  await options.reload();

  return true;
}

/** Texto de una confirmación en línea (RN-02). */
export type InlineConfirmCopy = {
  /** Nombre accesible del grupo. */
  label: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
};
