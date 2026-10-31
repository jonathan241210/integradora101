import type {
  AdminApi,
  PageMeta,
  StaffAccountDto,
  StaffCreateInput,
  StaffOptionsDto,
  StaffUpdateInput,
} from "./admin-types";
import { describeApiError } from "./api-errors";
import type { ConfirmationCopy } from "./confirmation";
import {
  initialManagedListState,
  managedListReducer,
  reportLoadError,
  runOperation,
  type ManagedListAction,
  type ManagedListState,
} from "./managed-list";

export type StaffDialog =
  | { kind: "create" }
  | { kind: "edit"; account: StaffAccountDto }
  | { kind: "status"; account: StaffAccountDto }
  | { kind: "delete"; account: StaffAccountDto }
  | { kind: "password"; account: StaffAccountDto }
  | { kind: "two-factor"; account: StaffAccountDto };

export type StaffQuery = {
  search: string;
  role: string;
  department_id: string;
  status: "" | "active" | "inactive";
  page: number;
};

export type StaffState = ManagedListState<StaffAccountDto, StaffDialog> & {
  query: StaffQuery;
  meta: PageMeta | null;
  options: StaffOptionsDto | null;
  optionsError: string;
};

export type StaffAction =
  | ManagedListAction<StaffAccountDto, StaffDialog>
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

export const initialStaffState: StaffState = {
  ...initialManagedListState<StaffAccountDto, StaffDialog>(),
  query: initialStaffQuery,
  meta: null,
  options: null,
  optionsError: "",
};

export function staffAccountsReducer(
  state: StaffState,
  action: StaffAction,
): StaffState {
  switch (action.type) {
    case "page-loaded":
      return {
        ...state,
        ...managedListReducer<StaffAccountDto, StaffDialog>(state, { type: "loaded", items: action.items }),
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
      return { ...state, ...managedListReducer<StaffAccountDto, StaffDialog>(state, action) };
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
  dialog: StaffDialog | null,
): ConfirmationCopy | null {
  if (!dialog || dialog.kind === "create" || dialog.kind === "edit") return null;

  const name = dialog.account.full_name;

  switch (dialog.kind) {
    case "status":
      return dialog.account.is_active
        ? {
            title: "Desactivar cuenta",
            message: `¿Desactivar la cuenta de ${name}? Se cerrarán sus sesiones y no podrá iniciar sesión hasta que se active de nuevo.`,
            confirmLabel: "Desactivar cuenta",
            danger: true,
          }
        : {
            title: "Activar cuenta",
            message: `¿Activar la cuenta de ${name}? Podrá iniciar sesión de nuevo.`,
            confirmLabel: "Activar cuenta",
            danger: false,
          };
    case "delete":
      return {
        title: "Eliminar cuenta",
        message: `¿Eliminar la cuenta de ${name}? Se cerrarán sus sesiones y dejará de aparecer en la lista.`,
        confirmLabel: "Eliminar cuenta",
        danger: true,
      };
    case "password":
      return {
        title: "Restablecer contraseña",
        message: `Escribe la nueva contraseña de ${name}. Se cerrarán sus sesiones abiertas.`,
        confirmLabel: "Restablecer contraseña",
        danger: true,
      };
    case "two-factor":
      return {
        title: "Restablecer verificación en dos pasos",
        message: `¿Restablecer el 2FA de ${name}? Tendrá que configurarlo de nuevo en su próximo acceso y se cerrarán sus sesiones.`,
        confirmLabel: "Restablecer 2FA",
        danger: true,
      };
    default:
      return null;
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
    if (isCurrent()) reportLoadError<StaffAccountDto, StaffDialog>(dispatch, error, silent);
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

export function createStaffAccount(
  api: AdminApi,
  dispatch: StaffDispatch,
  input: StaffCreateInput,
  reload: Reload,
): Promise<boolean> {
  return runOperation<StaffAccountDto, StaffDialog>(
    dispatch,
    () => api.users.create(input),
    "La cuenta se creó correctamente.",
    reload,
  );
}

export function updateStaffAccount(
  api: AdminApi,
  dispatch: StaffDispatch,
  account: StaffAccountDto,
  input: StaffUpdateInput,
  reload: Reload,
): Promise<boolean> {
  return runOperation<StaffAccountDto, StaffDialog>(
    dispatch,
    () => api.users.update(account.id, input),
    "Los cambios de la cuenta se guardaron.",
    reload,
  );
}

/**
 * Ejecuta la acción confirmada del diálogo abierto. La contraseña solo viaja
 * como argumento hacia la API: no se guarda en ningún estado (RN-07).
 */
export function confirmStaffDialog(
  api: AdminApi,
  dispatch: StaffDispatch,
  dialog: StaffDialog | null,
  password: string,
  reload: Reload,
): Promise<boolean> {
  if (!dialog || dialog.kind === "create" || dialog.kind === "edit") {
    return Promise.resolve(false);
  }

  const { account } = dialog;

  switch (dialog.kind) {
    case "status":
      return runOperation<StaffAccountDto, StaffDialog>(
        dispatch,
        () => api.users.setStatus(account.id, !account.is_active),
        account.is_active
          ? `La cuenta de ${account.full_name} se desactivó.`
          : `La cuenta de ${account.full_name} se activó.`,
        reload,
      );
    case "delete":
      return runOperation<StaffAccountDto, StaffDialog>(
        dispatch,
        () => api.users.remove(account.id),
        `La cuenta de ${account.full_name} se eliminó.`,
        reload,
      );
    case "password":
      return runOperation<StaffAccountDto, StaffDialog>(
        dispatch,
        () => api.users.resetPassword(account.id, password),
        `La contraseña de ${account.full_name} se restableció.`,
        reload,
      );
    case "two-factor":
      return runOperation<StaffAccountDto, StaffDialog>(
        dispatch,
        () => api.users.resetTwoFactor(account.id),
        `La verificación en dos pasos de ${account.full_name} se restableció.`,
        reload,
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
    openDialog: (dialog: StaffDialog) => void;
    closeDialog: () => void;
    dismissNotice: () => void;
    create: (values: StaffFormValues) => void;
    update: (account: StaffAccountDto, values: StaffFormValues) => void;
    confirm: (password: string) => void;
  };
};
