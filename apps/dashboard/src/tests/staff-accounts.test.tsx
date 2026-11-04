import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createPasswordResetHandlers } from "../components/InlinePasswordReset";
import { UsersView } from "../views/UsersView";
import { emptyPasswordField } from "../viewmodels/password-field";
import type { PendingActionType } from "../viewmodels/inline-list";
import {
  confirmStaffAction,
  emptyStaffForm,
  getStaffConfirmation,
  initialStaffState,
  loadStaffAccounts,
  loadStaffOptions,
  saveStaffAccount,
  staffAccountsReducer,
  staffDepartmentChanges,
  staffFormFromAccount,
  suggestRole,
  toStaffUpdateInput,
  type StaffAccountsViewModel,
  type StaffAction,
  type StaffState,
} from "../viewmodels/staff-accounts";
import {
  apiError,
  createAdminApiMock,
  createHarness,
  staffAccount,
  staffOptions,
} from "./admin-fixtures";

const actions: StaffAccountsViewModel["actions"] = {
  changeQuery: vi.fn(),
  reload: vi.fn(),
  dismissNotice: vi.fn(),
  toggleForm: vi.fn(),
  changeForm: vi.fn(),
  changeDepartment: vi.fn(),
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  submit: vi.fn(),
  openAction: vi.fn(),
  closeAction: vi.fn(),
  confirmAction: vi.fn(),
};

function readyState(overrides: Partial<StaffState> = {}): StaffState {
  return {
    ...initialStaffState,
    status: "ready",
    items: [staffAccount()],
    meta: { current_page: 2, last_page: 3, per_page: 25, total: 60 },
    options: staffOptions,
    ...overrides,
  };
}

function render(state: StaffState) {
  return renderToStaticMarkup(<UsersView state={state} actions={actions} />);
}

function harness(state: StaffState = readyState()) {
  return createHarness<StaffState, StaffAction>(staffAccountsReducer, state);
}

describe("CA-03 administration-sections", () => {
  it("muestra la tabla paginada con columnas, búsqueda y filtros por rol, área y estado", () => {
    const markup = render(readyState());

    for (const header of ["Nombre", "Correo", "Área", "Rol", "Estado", "Último acceso"]) {
      expect(markup).toContain(`>${header}</th>`);
    }
    expect(markup).toContain("Ana López Pérez");
    expect(markup).toContain("ana@test.arca.invalid");
    expect(markup).toContain("Taquilla");
    expect(markup).toContain("Cajero");
    expect(markup).toContain("Activa");
    expect(markup).toContain('for="users-search"');
    expect(markup).toContain('for="users-filter-role"');
    expect(markup).toContain('for="users-filter-department"');
    expect(markup).toContain('for="users-filter-status"');
    expect(markup).toContain("Página 2 de 3");
    expect(markup).toContain("60 en total");
    expect(markup).not.toContain("Prototipo de demostración");
  });

  it("presenta los estados de carga, vacío y error con role=alert en español", () => {
    const loading = render(readyState({ status: "loading", items: [] }));
    const empty = render(readyState({ status: "empty", items: [] }));
    const failed = render(
      readyState({ status: "error", items: [], error: "No fue posible conectar con el servidor." }),
    );

    expect(loading).toContain("Cargando cuentas…");
    expect(loading).toContain('role="status"');
    expect(empty).toContain("No hay cuentas que coincidan con la búsqueda.");
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("No fue posible conectar con el servidor.");
    expect(failed).toContain("Reintentar");
  });

  it("carga la lista con filtros y página y distingue vacío de listado", async () => {
    const api = createAdminApiMock();
    const h = harness({ ...initialStaffState });
    const query = { search: " ana ", role: "cashier", department_id: "2", status: "active" as const, page: 2 };

    await loadStaffAccounts(api, h.dispatch, query);

    expect(api.users.list).toHaveBeenCalledWith({
      search: "ana",
      role: "cashier",
      department_id: "2",
      status: "active",
      page: 2,
    });
    expect(h.state.status).toBe("ready");

    api.users.list.mockResolvedValueOnce({
      data: [],
      meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 },
    });
    await loadStaffAccounts(api, h.dispatch, { ...query, page: 1 });
    expect(h.state.status).toBe("empty");

    api.users.list.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await loadStaffAccounts(api, h.dispatch, query);
    expect(h.state.status).toBe("error");
    expect(h.state.error).toContain("No fue posible conectar");
  });

  it("si la página queda vacía tras eliminar, retrocede una página antes de recargar", async () => {
    const api = createAdminApiMock();
    api.users.list.mockResolvedValueOnce({
      data: [],
      meta: { current_page: 3, last_page: 2, per_page: 25, total: 25 },
    });
    const h = harness(readyState({ query: { ...initialStaffState.query, page: 3 } }));

    await loadStaffAccounts(api, h.dispatch, h.state.query, true);

    expect(h.state.query.page).toBe(2);
    expect(h.state.items).toHaveLength(1);
  });

  it("al cambiar un filtro vuelve a la primera página", () => {
    const h = harness(readyState({ query: { ...initialStaffState.query, page: 3 } }));

    h.dispatch({ type: "query-changed", changes: { role: "cashier" } });
    expect(h.state.query).toMatchObject({ role: "cashier", page: 1 });

    h.dispatch({ type: "query-changed", changes: { page: 2 } });
    expect(h.state.query).toMatchObject({ role: "cashier", page: 2 });
  });
});

describe("CA-04 administration-sections", () => {
  it("propone el rol sugerido por la API al elegir un área y solo si es asignable", () => {
    expect(suggestRole(staffOptions, "2")).toBe("cashier");
    expect(suggestRole(staffOptions, "3")).toBe("veterinarian");
    expect(suggestRole(staffOptions, "4")).toBe("");
    expect(suggestRole(staffOptions, "999")).toBe("");
    expect(suggestRole(null, "2")).toBe("");
    // El ViewModel propone el rol en el alta y lo conserva al editar.
    expect(staffDepartmentChanges(readyState(), "3")).toEqual({ department_id: "3", role: "veterinarian" });
    expect(
      staffDepartmentChanges(
        readyState({ editing: staffAccount(), form: { ...emptyStaffForm(), role: "cashier" } }),
        "3",
      ),
    ).toEqual({ department_id: "3", role: "cashier" });
  });

  it("solo ofrece los roles asignables que devuelve la API", async () => {
    const api = createAdminApiMock();
    const h = harness({ ...initialStaffState });

    await loadStaffOptions(api, h.dispatch);
    const markup = render(readyState({ options: h.state.options }));

    expect(markup).toContain("Crear usuario");
    expect(markup).toContain(">Cajero</option>");
    expect(markup).toContain(">Veterinario</option>");
    expect(markup).not.toContain(">Administrador</option>");
    expect(markup).not.toContain(">Ejecutivo</option>");
    expect(markup).not.toContain("zoo-admin");
  });

  it("muestra los errores 422 junto a cada campo y conserva el formulario", async () => {
    const api = createAdminApiMock();
    api.users.create.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", {
        email: ["El correo ya está registrado."],
        password: ["La contraseña es demasiado débil."],
      }),
    );
    const typed = { ...emptyStaffForm(), first_name: "Luis", email: "ana@test.arca.invalid", password: "debil" };
    const h = harness(readyState({ form: typed }));

    const ok = await saveStaffAccount(api, h.dispatch, h.state, async () => undefined);
    const markup = render(h.state);

    expect(ok).toBe(false);
    expect(h.state.editing).toBeNull();
    expect(h.state.form).toEqual(typed);
    expect(markup).toContain('id="staff-email-error"');
    expect(markup).toContain("El correo ya está registrado.");
    expect(markup).toContain('aria-describedby="staff-email-error"');
    expect(markup).toContain("La contraseña es demasiado débil.");
    expect(markup).toContain('value="Luis"');
  });
});

describe("CA-05 administration-sections", () => {
  const account = staffAccount();
  const editingState = () =>
    readyState({ editing: account, form: staffFormFromAccount(account) });

  it("permite cambiar nombre, apellidos, área y rol, y muestra el correo sin poder editarlo", () => {
    const markup = render(editingState());

    expect(markup).toContain("Editar usuario");
    expect(markup).toContain('for="staff-first_name"');
    expect(markup).toContain('for="staff-last_name"');
    expect(markup).toContain('for="staff-second_last_name"');
    expect(markup).toContain('for="staff-department_id"');
    expect(markup).toContain('for="staff-role"');
    expect(markup).toContain('value="ana@test.arca.invalid"');
    expect(markup).toMatch(/<input[^>]*id="staff-email"[^>]*readOnly=""|<input[^>]*readOnly=""[^>]*id="staff-email"/);
    expect(markup).toContain("El correo no se puede modificar.");
    expect(markup).not.toContain('id="staff-password"');
  });

  it("envía la edición sin el correo", async () => {
    const api = createAdminApiMock();
    const h = harness(editingState());
    const input = toStaffUpdateInput({
      first_name: " Ana ",
      last_name: "López",
      second_last_name: "",
      email: "otro@test.arca.invalid",
      department_id: "3",
      role: "veterinarian",
      password: "",
    });

    expect(input).not.toHaveProperty("email");
    expect(input).not.toHaveProperty("password");

    h.dispatch({
      type: "form-changed",
      changes: { first_name: " Ana ", second_last_name: "", department_id: "3", role: "veterinarian" },
    });
    await saveStaffAccount(api, h.dispatch, h.state, async () => undefined);

    expect(api.users.update).toHaveBeenCalledWith(7, {
      first_name: "Ana",
      last_name: "López",
      second_last_name: null,
      department_id: 3,
      role: "veterinarian",
    });
    expect(h.state.editing).toBeNull();
  });
});

describe("CA-06 administration-sections", () => {
  const account = staffAccount();
  const cases: [PendingActionType, boolean, string][] = [
    ["status", true, "¿Desactivar la cuenta de Ana López Pérez?"],
    ["status", false, "¿Activar la cuenta de Ana López Pérez?"],
    ["delete", true, "¿Eliminar la cuenta de Ana López Pérez?"],
    ["reset-password", true, "Escribe la nueva contraseña de Ana López Pérez."],
    ["reset-two-factor", true, "¿Restablecer el 2FA de Ana López Pérez?"],
  ];

  it.each(cases)("pide confirmación en línea que nombra la cuenta y el efecto (%s, activa=%s)", (type, active, text) => {
    const target = staffAccount({ is_active: active });
    const copy = getStaffConfirmation(type, target);
    const markup = render(readyState({ items: [target], pendingAction: { type, id: target.id } }));

    expect(copy.message).toContain(text);
    expect(markup).toContain(copy.label);
    expect(markup).toContain('role="group"');
    expect(markup).not.toContain("<dialog");
  });

  it("solo llama a la API al confirmar", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState());
    const reload = vi.fn(async () => undefined);

    h.dispatch({ type: "action-opened", action: { type: "status", id: 7 } });
    expect(api.users.setStatus).not.toHaveBeenCalled();

    await confirmStaffAction(api, h.dispatch, h.state, "", reload);
    expect(api.users.setStatus).toHaveBeenCalledWith(7, false);

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 7 } });
    await confirmStaffAction(api, h.dispatch, h.state, "", reload);
    expect(api.users.remove).toHaveBeenCalledWith(7);
  });
});

describe("CA-07 administration-sections", () => {
  it.each([
    [403, "No tienes permiso para realizar esta acción."],
    [404, "Usuario no encontrado."],
    [422, "No puedes desactivar tu propia cuenta."],
  ])("muestra el mensaje de la API en %i sin cambiar la lista", async (status, message) => {
    const api = createAdminApiMock();
    api.users.setStatus.mockRejectedValueOnce(apiError(status, message));
    const h = harness(readyState({ pendingAction: { type: "status", id: 7 } }));
    const reload = vi.fn(async () => undefined);
    const itemsBefore = h.state.items;

    const ok = await confirmStaffAction(api, h.dispatch, h.state, "", reload);
    const markup = render(h.state);

    expect(ok).toBe(false);
    expect(h.state.actionError).toBe(message);
    expect(h.state.items).toBe(itemsBefore);
    expect(reload).not.toHaveBeenCalled();
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(message);
  });

  it("tras un éxito cierra la confirmación, recarga la lista y confirma con un aviso accesible", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState({ pendingAction: { type: "delete", id: 7 } }));
    const reload = vi.fn(() => loadStaffAccounts(api, h.dispatch, h.state.query, true));

    await confirmStaffAction(api, h.dispatch, h.state, "", reload);
    const markup = render(h.state);

    expect(reload).toHaveBeenCalledOnce();
    expect(api.users.list).toHaveBeenCalledOnce();
    expect(h.state.pendingAction).toBeNull();
    expect(h.state.notice).toBe("La cuenta de Ana López Pérez se eliminó.");
    expect(markup).toContain('role="status"');
    expect(markup).toContain("La cuenta de Ana López Pérez se eliminó.");
  });
});

describe("CA-10 inline-content-forms", () => {
  it("restablecer contraseña muestra el campo en línea con mostrar/ocultar accesible y Confirmar/Cancelar", () => {
    const markup = render(readyState({ pendingAction: { type: "reset-password", id: 7 } }));

    expect(markup).toContain('type="password"');
    expect(markup).toContain('for="staff-7-new-password"');
    expect(markup).toContain('aria-controls="staff-7-new-password"');
    // Una sola forma de anunciar el estado: la etiqueta cambia, sin aria-pressed.
    expect(markup).not.toContain("aria-pressed");
    expect(markup).toContain(">Mostrar contraseña<");
    expect(markup).toContain(">Confirmar<");
    expect(markup).toContain(">Cancelar<");
    expect(markup).not.toContain("<dialog");
  });

  it("solo llama a la API al confirmar y la contraseña no queda en el estado ni en las acciones", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState({ pendingAction: { type: "reset-password", id: 7 } }));

    expect(api.users.resetPassword).not.toHaveBeenCalled();
    await confirmStaffAction(api, h.dispatch, h.state, "Nueva#Clave123", async () => undefined);

    expect(api.users.resetPassword).toHaveBeenCalledWith(7, "Nueva#Clave123");
    expect(JSON.stringify(h.state)).not.toContain("Nueva#Clave123");
    expect(JSON.stringify(h.actions)).not.toContain("Nueva#Clave123");
    expect(h.state.pendingAction).toBeNull();
  });
});

describe("CA-10 inline-content-forms · campo de contraseña en línea", () => {
  const setup = (busy = false) => {
    let field = emptyPasswordField;
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const handlers = () =>
      createPasswordResetHandlers({
        field,
        setField: (next) => {
          field = next;
        },
        busy,
        onConfirm,
        onCancel,
      });

    return { handlers, onConfirm, onCancel, get field() { return field; } };
  };

  it("el componente vacía la contraseña al confirmar y «Mostrar» vuelve a ocultarla", () => {
    const t = setup();

    t.handlers().change("Nueva#Clave123");
    t.handlers().toggle();
    expect(t.field).toEqual({ value: "Nueva#Clave123", visible: true });

    t.handlers().submit();

    expect(t.onConfirm).toHaveBeenCalledWith("Nueva#Clave123");
    expect(t.field).toEqual({ value: "", visible: false });
  });

  it("no envía un valor vacío ni con una petición en curso", () => {
    const empty = setup();
    const busy = setup(true);

    empty.handlers().submit();
    busy.handlers().change("abc");
    busy.handlers().submit();

    expect(empty.onConfirm).not.toHaveBeenCalled();
    expect(busy.onConfirm).not.toHaveBeenCalled();
  });

  it("Escape y Cancelar descartan lo escrito y cancelan, salvo con una petición en curso", () => {
    const t = setup();
    const stopPropagation = vi.fn();

    t.handlers().change("secreto");
    t.handlers().keyDown({ key: "Escape", stopPropagation });
    expect(t.onCancel).toHaveBeenCalledOnce();
    expect(t.field).toEqual({ value: "", visible: false });

    t.handlers().change("otro");
    t.handlers().cancel();
    expect(t.onCancel).toHaveBeenCalledTimes(2);
    expect(t.field.value).toBe("");

    const busy = setup(true);

    busy.handlers().keyDown({ key: "Escape", stopPropagation });
    busy.handlers().cancel();
    expect(busy.onCancel).not.toHaveBeenCalled();
  });
});

describe("CA-11 inline-content-forms", () => {
  it("restablecer 2FA abre la confirmación en línea con el nombre de la cuenta y el efecto", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState({ pendingAction: { type: "reset-two-factor", id: 7 } }));
    const markup = render(h.state);

    expect(markup).toContain("Ana López Pérez");
    expect(markup).toContain("Su segundo factor se borrará y tendrá que volver a configurarlo");
    expect(api.users.resetTwoFactor).not.toHaveBeenCalled();

    await confirmStaffAction(api, h.dispatch, h.state, "", async () => undefined);

    expect(api.users.resetTwoFactor).toHaveBeenCalledWith(7);
  });
});
