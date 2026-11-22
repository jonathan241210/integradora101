import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ContentCardActions } from "../components/ContentCardActions";
import { DashboardNotifications } from "../components/DashboardNotifications";
import { StaffActionDialog } from "../components/StaffActionDialog";
import { decideFocus } from "../components/inline-focus";
import { confirmationFromCopy } from "../viewmodels/confirmation";
import { StepUpCancelledError } from "../viewmodels/step-up";
import {
  AREA_ROLE_HELP,
  departmentSelectionChanges,
  roleSuggestionNotice,
} from "../viewmodels/staff-role-suggestion";
import {
  confirmStaffAction,
  emptyStaffForm,
  initialStaffState,
  staffAccountsReducer,
  staffDepartmentChanges,
  type StaffAction,
  type StaffAccountsViewModel,
  type StaffState,
} from "../viewmodels/staff-accounts";
import { UsersView } from "../views/UsersView";
import { createAdminApiMock, createHarness, staffAccount, staffOptions } from "./admin-fixtures";

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const actions: StaffAccountsViewModel["actions"] = {
  changeQuery: vi.fn(),
  reload: vi.fn(),
  reloadOptions: vi.fn(),
  dismissNotice: vi.fn(),
  toggleForm: vi.fn(),
  changeForm: vi.fn(),
  changeDepartment: vi.fn(),
  changeRole: vi.fn(),
  startEdit: vi.fn(),
  cancelEdit: vi.fn(),
  submit: vi.fn(),
  openAction: vi.fn(),
  closeAction: vi.fn(),
  confirmAction: vi.fn(),
};

function ready(overrides: Partial<StaffState> = {}): StaffState {
  return {
    ...initialStaffState,
    status: "ready",
    items: [staffAccount()],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    options: staffOptions,
    ...overrides,
  };
}

const renderUsers = (state: StaffState) =>
  renderToStaticMarkup(<UsersView state={state} actions={actions} />);

describe("CA-33 unified-reports-and-feedback · Usuarios confirma en ventana modal", () => {
  it.each([
    ["status", "Confirmar desactivar la cuenta de Ana López Pérez", "Se cerrarán sus sesiones"],
    ["delete", "Confirmar eliminar la cuenta de Ana López Pérez", "Es una baja lógica"],
    ["reset-password", "Restablecer la contraseña de Ana López Pérez", "Escribe la nueva contraseña"],
    ["reset-two-factor", "Confirmar restablecer el 2FA de Ana López Pérez", "Su segundo factor se borrará"],
  ] as const)("%s abre un diálogo con título, mensaje y botón peligroso", (type, title, message) => {
    const markup = renderUsers(ready({ pendingAction: { type, id: 7 } }));

    expect(markup).toContain("<dialog");
    expect(markup).toContain(`${title}</h2>`);
    expect(markup).toContain(message);
    expect(markup).toContain("arca-button--danger");
    expect(markup).not.toContain('role="group"');
    expect(markup).not.toContain("inline-confirm");
  });

  it("la fila de la tabla ya no lleva detalle en línea", () => {
    const users = source("views/UsersView.tsx");

    expect(users).not.toContain("rowDetail");
    expect(users).not.toContain("InlineConfirm");
    expect(users).toContain("<StaffActionDialog");
  });
});

describe("CA-34 unified-reports-and-feedback · Noticias y Eventos confirman en ventana modal", () => {
  it("las tarjetas solo traen los botones; la confirmación la monta la vista con ConfirmDialog", () => {
    const markup = renderToStaticMarkup(
      <ContentCardActions
        subject="la noticia Jaguar"
        isActive
        registerTrigger={() => () => undefined}
        onEdit={() => undefined}
        onOpen={() => undefined}
      />,
    );

    expect(markup).toContain("Desactivar la noticia Jaguar");
    expect(markup).toContain("Eliminar la noticia Jaguar");
    expect(markup).not.toContain('role="group"');
    for (const file of ["views/NewsView.tsx", "views/EventsView.tsx"]) {
      expect(source(file), file).toContain("<ConfirmDialog");
      expect(source(file), file).not.toContain("InlineConfirm");
    }
    expect(source("components/ContentCardActions.tsx")).not.toContain("InlineConfirm");
  });

  it("conserva el texto: el título de la confirmación es el nombre accesible anterior", () => {
    expect(
      confirmationFromCopy({ label: "Confirmar eliminar el evento X", message: "¿Eliminar?", confirmLabel: "Confirmar", danger: true }),
    ).toEqual({ title: "Confirmar eliminar el evento X", message: "¿Eliminar?", confirmLabel: "Confirmar", danger: true });
    expect(confirmationFromCopy(null)).toBeNull();
    // Noticias conserva el título «Confirmar cambio de estado» del cambio de estado.
    expect(source("views/NewsView.tsx")).toContain("Confirmar cambio de estado");
  });
});

describe("CA-35 unified-reports-and-feedback · errores, éxito y estado Procesando", () => {
  const dialog = (props: Partial<Parameters<typeof StaffActionDialog>[0]> = {}) =>
    renderToStaticMarkup(
      <DashboardNotifications>
        <StaffActionDialog
          pending={{ type: "reset-password", id: 7 }}
          account={staffAccount()}
          busy={false}
          error=""
          fieldErrors={{}}
          onConfirm={vi.fn()}
          onCancel={vi.fn()}
          {...props}
        />
      </DashboardNotifications>,
    );

  it("el error de la acción va dentro del diálogo y el de campo junto al campo de contraseña", () => {
    const markup = dialog({ error: "No se pudo restablecer.", fieldErrors: { password: ["Es débil."] } });

    expect(markup).toContain("No se pudo restablecer.");
    expect(markup).toContain("dialog-alert");
    expect(markup).toContain('id="staff-action-new-password-error"');
    expect(markup).toContain('type="password"');
    expect(markup).toContain(">Mostrar contraseña<");
  });

  it("mientras procesa muestra «Procesando…» y bloquea los botones", () => {
    const markup = dialog({ busy: true });

    expect(markup).toContain("Procesando…");
    expect(markup.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("el éxito cierra el diálogo y sale como aviso; el error deja abierta la acción", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, ready());

    h.dispatch({ type: "action-opened", action: { type: "delete", id: 7 } });
    h.dispatch({ type: "save-started", scope: "action" });
    h.dispatch({ type: "save-failed", scope: "action", message: "Falló.", fieldErrors: {} });
    expect(h.state.pendingAction).toEqual({ type: "delete", id: 7 });
    expect(h.state.actionError).toBe("Falló.");

    h.dispatch({ type: "saved", scope: "action", notice: "La cuenta se eliminó.", resetForm: null });
    expect(h.state.pendingAction).toBeNull();
    expect(h.state.notice).toBe("La cuenta se eliminó.");
  });

  it("la vista de Usuarios no repite el error general fuera del diálogo", () => {
    expect(source("views/UsersView.tsx")).toContain('<ActionError message={pendingAction === null ? state.actionError : ""} />');
    expect(source("views/NewsView.tsx")).toContain('<ActionError message={pendingAction === null ? state.actionError : ""} />');
    expect(source("views/EventsView.tsx")).toContain('<ActionError message={pendingAction === null ? state.actionError : ""} />');
  });

  it("la contraseña nueva no queda en el estado ni en las acciones (dashboard-004 RN-04)", async () => {
    const api = createAdminApiMock();
    const h = createHarness<StaffState, StaffAction>(
      staffAccountsReducer,
      ready({ pendingAction: { type: "reset-password", id: 7 } }),
    );

    await confirmStaffAction(api, h.dispatch, h.state, "Nueva#Clave123", async () => undefined);

    expect(api.users.resetPassword).toHaveBeenCalledWith(7, "Nueva#Clave123");
    expect(JSON.stringify(h.state)).not.toContain("Nueva#Clave123");
  });
});

describe("CA-36 unified-reports-and-feedback · confirmación de contraseña sobre el diálogo de la acción", () => {
  it("cancelar la contraseña del administrador deja abierto el diálogo de la acción, sin error", async () => {
    const api = createAdminApiMock();
    const h = createHarness<StaffState, StaffAction>(
      staffAccountsReducer,
      ready({ pendingAction: { type: "delete", id: 7 } }),
    );
    const protect = vi.fn(async () => {
      throw new StepUpCancelledError();
    });

    await confirmStaffAction(api, h.dispatch, h.state, "", async () => undefined, protect);

    expect(protect).toHaveBeenCalledOnce();
    expect(h.state.pendingAction).toEqual({ type: "delete", id: 7 });
    expect(h.state.actionBusy).toBe(false);
    expect(h.state.actionError).toBe("");
  });

  it("el diálogo de contraseña es único y modal, y la acción espera detrás sin cerrarse", () => {
    const provider = source("components/StepUpProvider.tsx");

    expect(provider.match(/<StepUpConfirmationDialog/g)).toHaveLength(1);
    // La acción mantiene `pendingAction` mientras la petición está en curso.
    const h = createHarness<StaffState, StaffAction>(
      staffAccountsReducer,
      ready({ pendingAction: { type: "status", id: 7 } }),
    );

    h.dispatch({ type: "save-started", scope: "action" });
    h.dispatch({ type: "action-closed" });
    expect(h.state.pendingAction).toEqual({ type: "status", id: 7 });
    // El diálogo de contraseña devuelve el foco al elemento activo al abrirse: el botón del diálogo de la acción.
    expect(source("components/StepUpConfirmationDialog.tsx")).toContain("document.activeElement");
  });
});

describe("CA-37 unified-reports-and-feedback · foco y retiro de los componentes en línea", () => {
  it("al cerrar la confirmación el foco vuelve al botón que la abrió", () => {
    expect(
      decideFocus({ previous: { type: "reset-two-factor", id: 7 }, current: null, hasNotice: true, editingChanged: false }),
    ).toEqual({ kind: "trigger", key: "7:reset-two-factor" });
    for (const file of ["views/UsersView.tsx", "views/NewsView.tsx", "views/EventsView.tsx"]) {
      expect(source(file), file).toContain("useInlineFocus");
    }
  });

  it("InlineConfirm e InlinePasswordReset ya no existen ni se importan", () => {
    const base = new URL("../", import.meta.url);

    expect(existsSync(new URL("components/InlineConfirm.tsx", base))).toBe(false);
    expect(existsSync(new URL("components/InlinePasswordReset.tsx", base))).toBe(false);
    for (const file of ["views/UsersView.tsx", "views/NewsView.tsx", "views/EventsView.tsx", "components/ContentCardActions.tsx"]) {
      expect(source(file), file).not.toMatch(/InlineConfirm|InlinePasswordReset/);
    }
  });
});

describe("CA-38 unified-reports-and-feedback · el área sugiere el rol", () => {
  it("al elegir el área el rol se llena con el sugerido por la API", () => {
    expect(
      departmentSelectionChanges({ options: staffOptions, departmentId: "2", currentRole: "", roleChosenManually: false }),
    ).toEqual({ department_id: "2", role: "cashier" });
    expect(staffDepartmentChanges(ready(), "3")).toEqual({ department_id: "3", role: "veterinarian" });
  });

  it("sin rol sugerido conserva el rol actual", () => {
    expect(
      departmentSelectionChanges({ options: staffOptions, departmentId: "4", currentRole: "cashier", roleChosenManually: false }),
    ).toEqual({ department_id: "4", role: "cashier" });
  });

  it("al editar, el rol se conserva al abrir y al cambiar el área; solo se muestra el aviso", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, ready());

    h.dispatch({
      type: "edit-started",
      item: staffAccount(),
      form: { ...emptyStaffForm(), department_id: "3", role: "veterinarian" },
    });
    expect(h.state.form.role).toBe("veterinarian");
    expect(staffDepartmentChanges(h.state, "2")).toEqual({ department_id: "2", role: "veterinarian" });
    h.dispatch({ type: "form-changed", changes: staffDepartmentChanges(h.state, "2") });
    expect(renderUsers(h.state)).toContain("El rol sugerido para Taquilla es Cajero.");
  });
});

describe("CA-39 unified-reports-and-feedback · la elección manual del rol no se pisa", () => {
  it("tras elegir el rol a mano, cambiar el área no lo modifica", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, ready());

    h.dispatch({ type: "form-changed", changes: staffDepartmentChanges(h.state, "2") });
    expect(h.state.form.role).toBe("cashier");

    h.dispatch({ type: "role-chosen", role: "veterinarian" });
    expect(h.state.roleChosenManually).toBe(true);

    h.dispatch({ type: "form-changed", changes: staffDepartmentChanges(h.state, "3") });
    expect(h.state.form).toMatchObject({ department_id: "3", role: "veterinarian" });
  });

  it("al reiniciar el formulario (editar o guardar) la elección manual se descarta", () => {
    const h = createHarness<StaffState, StaffAction>(staffAccountsReducer, ready({ roleChosenManually: true }));

    h.dispatch({ type: "saved", scope: "form", notice: "Listo.", resetForm: emptyStaffForm() });
    expect(h.state.roleChosenManually).toBe(false);
    h.dispatch({ type: "role-chosen", role: "cashier" });
    h.dispatch({ type: "edit-cancelled", form: emptyStaffForm() });
    expect(h.state.roleChosenManually).toBe(false);
  });
});

describe("CA-40 unified-reports-and-feedback · texto de ayuda de Área y Rol", () => {
  it("muestra el texto fijo junto a los dos campos", () => {
    const markup = renderUsers(ready());

    expect(AREA_ROLE_HELP).toBe(
      "El área es dónde trabaja la persona; el rol define qué puede hacer en el sistema.",
    );
    expect(markup).toContain(AREA_ROLE_HELP);
    expect(markup.indexOf('id="staff-department_id"')).toBeLessThan(markup.indexOf('id="staff-role"'));
    expect(markup.indexOf('id="staff-role"')).toBeLessThan(markup.indexOf(AREA_ROLE_HELP));
  });
});

describe("CA-41 unified-reports-and-feedback · aviso suave del rol sugerido", () => {
  it("avisa sin bloquear cuando el rol elegido no es el sugerido", () => {
    expect(roleSuggestionNotice({ options: staffOptions, departmentId: "2", role: "veterinarian" })).toBe(
      "El rol sugerido para Taquilla es Cajero. Puedes asignar otro si la persona lo necesita.",
    );

    const markup = renderUsers(ready({ form: { ...emptyStaffForm(), department_id: "2", role: "veterinarian" } }));

    expect(markup).toContain("El rol sugerido para Taquilla es Cajero.");
    expect(markup).toContain('id="staff-role-suggestion"');
    expect(markup).toContain('role="status"');
    // No bloquea: el envío no depende del aviso.
    expect(source("viewmodels/staff-accounts.ts")).not.toContain("roleSuggestionNotice");
  });

  it("no hay aviso con el rol sugerido, sin rol elegido o sin sugerencia del área", () => {
    expect(roleSuggestionNotice({ options: staffOptions, departmentId: "2", role: "cashier" })).toBeNull();
    expect(roleSuggestionNotice({ options: staffOptions, departmentId: "2", role: "" })).toBeNull();
    expect(roleSuggestionNotice({ options: staffOptions, departmentId: "4", role: "cashier" })).toBeNull();
    expect(roleSuggestionNotice({ options: null, departmentId: "2", role: "cashier" })).toBeNull();
    expect(renderUsers(ready({ form: { ...emptyStaffForm(), department_id: "4", role: "cashier" } }))).not.toContain(
      "staff-role-suggestion",
    );
  });
});

describe("CA-42 unified-reports-and-feedback · la regla vive en un viewmodel puro", () => {
  it("la vista solo llama a las funciones del viewmodel y no calcula la sugerencia", () => {
    const view = source("views/UsersView.tsx");
    const pure = source("viewmodels/staff-role-suggestion.ts");

    expect(view).toContain("roleSuggestionNotice(");
    expect(view).not.toContain("suggested_role");
    expect(pure).not.toMatch(/from\s+["']react["']|\bfetch\s*\(|\baxios\b|@arca\/api-client/);
    expect(source("viewmodels/useStaffAccounts.ts")).toContain("staffDepartmentChanges(state, departmentId)");
  });
});
