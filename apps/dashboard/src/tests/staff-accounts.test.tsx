import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { UsersView } from "../views/UsersView";
import {
  confirmStaffDialog,
  createStaffAccount,
  getStaffConfirmation,
  initialStaffState,
  loadStaffAccounts,
  loadStaffOptions,
  staffAccountsReducer,
  suggestRole,
  toStaffUpdateInput,
  updateStaffAccount,
  type StaffAccountsViewModel,
  type StaffAction,
  type StaffDialog,
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
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
  dismissNotice: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  confirm: vi.fn(),
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
  });

  it("solo ofrece los roles asignables que devuelve la API", async () => {
    const api = createAdminApiMock();
    const h = harness({ ...initialStaffState });

    await loadStaffOptions(api, h.dispatch);
    const markup = render(readyState({ options: h.state.options, dialog: { kind: "create" } }));

    expect(markup).toContain("Crear usuario");
    expect(markup).toContain(">Cajero</option>");
    expect(markup).toContain(">Veterinario</option>");
    expect(markup).not.toContain(">Administrador</option>");
    expect(markup).not.toContain(">Ejecutivo</option>");
    expect(markup).not.toContain("zoo-admin");
  });

  it("muestra los errores 422 junto a cada campo y conserva el diálogo abierto", async () => {
    const api = createAdminApiMock();
    api.users.create.mockRejectedValueOnce(
      apiError(422, "Los datos no son válidos.", {
        email: ["El correo ya está registrado."],
        password: ["La contraseña es demasiado débil."],
      }),
    );
    const h = harness(readyState({ dialog: { kind: "create" } }));

    const ok = await createStaffAccount(
      api,
      h.dispatch,
      {
        first_name: "Luis",
        last_name: "Soto",
        email: "ana@test.arca.invalid",
        department_id: 2,
        role: "cashier",
        password: "debil",
      },
      async () => undefined,
    );
    const markup = render(h.state);

    expect(ok).toBe(false);
    expect(h.state.dialog).toEqual({ kind: "create" });
    expect(markup).toContain('id="staff-email-error"');
    expect(markup).toContain("El correo ya está registrado.");
    expect(markup).toContain('aria-describedby="staff-email-error"');
    expect(markup).toContain("La contraseña es demasiado débil.");
  });
});

describe("CA-05 administration-sections", () => {
  const account = staffAccount();

  it("permite cambiar nombre, apellidos, área y rol, y muestra el correo sin poder editarlo", () => {
    const markup = render(readyState({ dialog: { kind: "edit", account } }));

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
    const h = harness(readyState({ dialog: { kind: "edit", account } }));
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

    await updateStaffAccount(api, h.dispatch, account, input, async () => undefined);

    expect(api.users.update).toHaveBeenCalledWith(7, {
      first_name: "Ana",
      last_name: "López",
      second_last_name: null,
      department_id: 3,
      role: "veterinarian",
    });
    expect(h.state.dialog).toBeNull();
  });
});

describe("CA-06 administration-sections", () => {
  const account = staffAccount();
  const dialogs: [StaffDialog, string][] = [
    [{ kind: "status", account }, "Desactivar cuenta"],
    [{ kind: "status", account: staffAccount({ is_active: false }) }, "Activar cuenta"],
    [{ kind: "delete", account }, "Eliminar cuenta"],
    [{ kind: "password", account }, "Restablecer contraseña"],
    [{ kind: "two-factor", account }, "Restablecer verificación en dos pasos"],
  ];

  it.each(dialogs)("pide confirmación que nombra la cuenta y el efecto (%j)", (dialog, title) => {
    const copy = getStaffConfirmation(dialog);
    const markup = render(readyState({ dialog }));

    expect(copy?.title).toBe(title);
    expect(copy?.message).toContain("Ana López Pérez");
    expect(markup).toContain(title);
    expect(markup).toContain("Ana López Pérez");
    expect(markup).toContain('aria-labelledby="dialog-title-');
  });

  it("solo llama a la API al confirmar", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState());
    const reload = vi.fn(async () => undefined);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "status", account } });
    expect(api.users.setStatus).not.toHaveBeenCalled();

    await confirmStaffDialog(api, h.dispatch, h.state.dialog, "", reload);
    expect(api.users.setStatus).toHaveBeenCalledWith(7, false);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "delete", account } });
    await confirmStaffDialog(api, h.dispatch, h.state.dialog, "", reload);
    expect(api.users.remove).toHaveBeenCalledWith(7);

    h.dispatch({ type: "dialog-opened", dialog: { kind: "two-factor", account } });
    await confirmStaffDialog(api, h.dispatch, h.state.dialog, "", reload);
    expect(api.users.resetTwoFactor).toHaveBeenCalledWith(7);
  });

  it("restablece la contraseña con mostrar/ocultar accesible y sin guardarla en el estado", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState({ dialog: { kind: "password", account } }));
    const markup = render(h.state);

    expect(markup).toContain('type="password"');
    expect(markup).toContain('for="staff-new-password"');
    expect(markup).toContain('aria-controls="staff-new-password"');
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('aria-label="Mostrar contraseña"');

    await confirmStaffDialog(api, h.dispatch, h.state.dialog, "Nueva#Clave123", async () => undefined);

    expect(api.users.resetPassword).toHaveBeenCalledWith(7, "Nueva#Clave123");
    expect(JSON.stringify(h.state)).not.toContain("Nueva#Clave123");
    expect(JSON.stringify(h.actions)).not.toContain("Nueva#Clave123");
  });
});

describe("CA-07 administration-sections", () => {
  const account = staffAccount();

  it.each([
    [403, "No tienes permiso para realizar esta acción."],
    [404, "Usuario no encontrado."],
    [422, "No puedes desactivar tu propia cuenta."],
  ])("muestra el mensaje de la API en %i sin cambiar la lista", async (status, message) => {
    const api = createAdminApiMock();
    api.users.setStatus.mockRejectedValueOnce(apiError(status, message));
    const h = harness(readyState({ dialog: { kind: "status", account } }));
    const reload = vi.fn(async () => undefined);
    const itemsBefore = h.state.items;

    const ok = await confirmStaffDialog(api, h.dispatch, h.state.dialog, "", reload);
    const markup = render(h.state);

    expect(ok).toBe(false);
    expect(h.state.actionError).toBe(message);
    expect(h.state.items).toBe(itemsBefore);
    expect(reload).not.toHaveBeenCalled();
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(message);
  });

  it("tras un éxito cierra el diálogo, recarga la lista y confirma con un aviso accesible", async () => {
    const api = createAdminApiMock();
    const h = harness(readyState({ dialog: { kind: "delete", account } }));
    const reload = vi.fn(() => loadStaffAccounts(api, h.dispatch, h.state.query, true));

    await confirmStaffDialog(api, h.dispatch, h.state.dialog, "", reload);
    const markup = render(h.state);

    expect(reload).toHaveBeenCalledOnce();
    expect(api.users.list).toHaveBeenCalledOnce();
    expect(h.state.dialog).toBeNull();
    expect(h.state.notice).toBe("La cuenta de Ana López Pérez se eliminó.");
    expect(markup).toContain('role="status"');
    expect(markup).toContain("La cuenta de Ana López Pérez se eliminó.");
  });
});
