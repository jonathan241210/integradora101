import type {
  AdminApi,
  PageMeta,
  StaffAccountDto,
  StaffCreateInput,
  StaffOptionsDto,
  StaffUpdateInput,
} from "./admin-types";
import { describeApiError } from "./api-errors";
import {
  initialInlineListState,
  inlineListReducer,
  reportInlineLoadError,
  runInlineOperation,
  type InlineConfirmCopy,
  type InlineListAction,
  type InlineListState,
  type PendingAction,
  type PendingActionType,
} from "./inline-list";

export type StaffQuery = {
  search: string;
  role: string;
  department_id: string;
  status: "" | "active" | "inactive";
  page: number;
};

export type StaffState = InlineListState<StaffAccountDto, StaffFormValues> & {
  query: StaffQuery;
  meta: PageMeta | null;
  options: StaffOptionsDto | null;
  optionsError: string;
};

export type StaffAction =
  | InlineListAction<StaffAccountDto, StaffFormValues>
  | { type: "page-loaded"; items: StaffAccountDto[]; meta: PageMeta }
  | { type: "query-changed"; changes: Partial<StaffQuery> }
  | { type: "options-loaded"; options: StaffOptionsDto }
  | { type: "options-failed"; message: string };

export type StaffDispatch = (action: StaffAction) => void;

export type StaffFormValues = {
  first_name: string;
  last_name: string;
  second_last_name: string;
  email: string;
  department_id: string;
  role: string;
  password: string;
};

export const initialStaffQuery: StaffQuery = {
  search: "",
  role: "",
  department_id: "",
  status: "",
  page: 1,
};

export function staffAccountsReducer(
  state: StaffState,
  action: StaffAction,
): StaffState {
  switch (action.type) {
    case "page-loaded":
      return {
        ...state,
        ...inlineListReducer<StaffAccountDto, StaffFormValues>(state, { type: "loaded", items: action.items }),
        meta: action.meta,
      };
    case "query-changed": {
      const resetsPage = Object.keys(action.changes).some((key) => key !== "page");

      return {
        ...state,
        query: {
          ...state.query,
          ...action.changes,
          page: resetsPage && action.changes.page === undefined
            ? 1
            : action.changes.page ?? state.query.page,
        },
      };
    }
    case "options-loaded":
      return { ...state, options: action.options, optionsError: "" };
    case "options-failed":
      return { ...state, optionsError: action.message };
    default:
      return { ...state, ...inlineListReducer<StaffAccountDto, StaffFormValues>(state, action) };
  }
}

/** Rol que la API sugiere para el área elegida, si es asignable. */
export function suggestRole(
  options: StaffOptionsDto | null,
  departmentId: string,
): string {
  const department = options?.departments.find(
    (item) => String(item.id) === departmentId,
  );
  const suggested = department?.suggested_role ?? "";

  return options?.roles.some((role) => role.name === suggested) ? suggested : "";
}

export function parseStatusFilter(value: string): StaffQuery["status"] {
  return value === "active" || value === "inactive" ? value : "";
}

export function emptyStaffForm(): StaffFormValues {
  return {
    first_name: "",
    last_name: "",
    second_last_name: "",
    email: "",
    department_id: "",
    role: "",
    password: "",
  };
}

export const initialStaffState: StaffState = {
  ...initialInlineListState<StaffAccountDto, StaffFormValues>(emptyStaffForm()),
  query: initialStaffQuery,
  meta: null,
  options: null,
  optionsError: "",
};

export function staffFormFromAccount(account: StaffAccountDto): StaffFormValues {
  return {
    first_name: account.first_name,
    last_name: account.last_name,
    second_last_name: account.second_last_name ?? "",
    email: account.email,
    department_id: account.department ? String(account.department.id) : "",
    role: account.role?.name ?? "",
    password: "",
  };
}

export function toStaffCreateInput(values: StaffFormValues): StaffCreateInput {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    second_last_name: values.second_last_name.trim() || null,
    email: values.email.trim(),
    department_id: Number(values.department_id),
    role: values.role,
    password: values.password,
  };
}

/** El correo no se edita: no forma parte de la actualización. */
export function toStaffUpdateInput(values: StaffFormValues): StaffUpdateInput {
  return {
    first_name: values.first_name.trim(),
    last_name: values.last_name.trim(),
    second_last_name: values.second_last_name.trim() || null,
    department_id: Number(values.department_id),
    role: values.role,
  };
}

export function toStaffListQuery(query: StaffQuery) {
  return {
    search: query.search.trim(),
    role: query.role,
    department_id: query.department_id,
    status: query.status,
    page: query.page,
  };
}

export function getStaffConfirmation(
  type: PendingActionType,
  account: StaffAccountDto,
): InlineConfirmCopy {
  const name = account.full_name;

  switch (type) {
    case "status":
      return account.is_active
        ? {
            label: `Confirmar desactivar la cuenta de ${name}`,
            message: `¿Desactivar la cuenta de ${name}? Se cerrarán sus sesiones y no podrá iniciar sesión hasta que se active de nuevo.`,
            confirmLabel: "Confirmar",
            danger: true,
          }
        : {
            label: `Confirmar activar la cuenta de ${name}`,
            message: `¿Activar la cuenta de ${name}? Podrá iniciar sesión de nuevo.`,
            confirmLabel: "Confirmar",
            danger: false,
          };
    case "delete":
      return {
        label: `Confirmar eliminar la cuenta de ${name}`,
        message: `¿Eliminar la cuenta de ${name}? Es una baja lógica: se cerrarán sus sesiones y dejará de aparecer en la lista.`,
        confirmLabel: "Confirmar",
        danger: true,
      };
    case "reset-password":
      return {
        label: `Restablecer la contraseña de ${name}`,
        message: `Escribe la nueva contraseña de ${name}. Se cerrarán sus sesiones abiertas.`,
        confirmLabel: "Confirmar",
        danger: true,
      };
    case "reset-two-factor":
      return {
        label: `Confirmar restablecer el 2FA de ${name}`,
        message: `¿Restablecer el 2FA de ${name}? Su segundo factor se borrará y tendrá que volver a configurarlo en su próximo acceso; se cerrarán sus sesiones.`,
        confirmLabel: "Confirmar",
        danger: true,
      };
  }
}

export async function loadStaffAccounts(
  api: AdminApi,
  dispatch: StaffDispatch,
  query: StaffQuery,
  silent = false,
  isCurrent: () => boolean = () => true,
): Promise<void> {
  if (!silent) dispatch({ type: "load-started" });

  try {
    const page = await api.users.list(toStaffListQuery(query));

    if (!isCurrent()) return;

    if (page.data.length === 0 && query.page > 1) {
      // Se eliminó el último elemento de la página: retrocede (la carga la dispara el cambio de consulta).
      dispatch({
        type: "query-changed",
        changes: { page: Math.max(1, Math.min(query.page - 1, page.meta.last_page)) },
      });
      return;
    }

    dispatch({ type: "page-loaded", items: page.data, meta: page.meta });
  } catch (error) {
    if (isCurrent()) reportInlineLoadError<StaffAccountDto, StaffFormValues>(dispatch, error, silent);
  }
}

export async function loadStaffOptions(
  api: AdminApi,
  dispatch: StaffDispatch,
): Promise<void> {
  try {
    dispatch({ type: "options-loaded", options: await api.users.options() });
  } catch (error) {
    const described = describeApiError(error);

    if (!described.unauthorized) {
      dispatch({ type: "options-failed", message: described.message });
    }
  }
}

type Reload = () => Promise<void>;

/** Rol que propone el área al cambiarla en el alta; en edición se conserva. */
export function staffDepartmentChanges(
  state: StaffState,
  departmentId: string,
): Partial<StaffFormValues> {
  return {
    department_id: departmentId,
    role: state.editing
      ? state.form.role
      : suggestRole(state.options, departmentId) || state.form.role,
  };
}

/** Alta o edición según `state.editing`. */
export function saveStaffAccount(
  api: AdminApi,
  dispatch: StaffDispatch,
  state: StaffState,
  reload: Reload,
): Promise<boolean> {
  // Doble envío: con una petición del formulario en curso no se lanza otra.
  if (state.saving) return Promise.resolve(false);

  const { editing, form } = state;

  return runInlineOperation<StaffAccountDto, StaffFormValues>(
    dispatch,
    () =>
      editing
        ? api.users.update(editing.id, toStaffUpdateInput(form))
        : api.users.create(toStaffCreateInput(form)),
    {
      notice: editing ? "Los cambios de la cuenta se guardaron." : "La cuenta se creó correctamente.",
      scope: "form",
      resetForm: emptyStaffForm(),
      reload,
    },
  );
}

/**
 * Ejecuta la acción en línea abierta. La contraseña nueva solo viaja como
 * argumento hacia la API: no se guarda en ningún estado (RN-04).
 */
export function confirmStaffAction(
  api: AdminApi,
  dispatch: StaffDispatch,
  state: StaffState,
  password: string,
  reload: Reload,
): Promise<boolean> {
  const action = state.pendingAction;
  const account = state.items.find((item) => item.id === action?.id);

  if (!action || !account || state.actionBusy) return Promise.resolve(false);

  const name = account.full_name;
  const run = (operation: () => Promise<unknown>, notice: string) =>
    runInlineOperation<StaffAccountDto, StaffFormValues>(dispatch, operation, {
      notice,
      scope: "action",
      resetForm: state.editing?.id === account.id ? emptyStaffForm() : null,
      reload,
    });

  switch (action.type) {
    case "status":
      return run(
        () => api.users.setStatus(account.id, !account.is_active),
        account.is_active ? `La cuenta de ${name} se desactivó.` : `La cuenta de ${name} se activó.`,
      );
    case "delete":
      return run(() => api.users.remove(account.id), `La cuenta de ${name} se eliminó.`);
    case "reset-password":
      return run(
        () => api.users.resetPassword(account.id, password),
        `La contraseña de ${name} se restableció.`,
      );
    case "reset-two-factor":
      return run(
        () => api.users.resetTwoFactor(account.id),
        `La verificación en dos pasos de ${name} se restableció.`,
      );
    default:
      return Promise.resolve(false);
  }
}

export type StaffAccountsViewModel = {
  state: StaffState;
  actions: {
    changeQuery: (changes: Partial<StaffQuery>) => void;
    reload: () => void;
    dismissNotice: () => void;
    toggleForm: () => void;
    changeForm: (changes: Partial<StaffFormValues>) => void;
    changeDepartment: (departmentId: string) => void;
    startEdit: (account: StaffAccountDto) => void;
    cancelEdit: () => void;
    submit: () => void;
    openAction: (action: PendingAction) => void;
    closeAction: () => void;
    confirmAction: (password: string) => void;
  };
};
