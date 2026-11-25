import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { StaffProfile } from "@arca/api-client";
import { UsersView } from "../views/UsersView";
import { getNavigationForProfile, sectionsForPermissions } from "../viewmodels/navigation";
import {
  CONSOLE_MANAGED_LABEL,
  TWO_FACTOR_REQUIRED_NOTE,
  confirmStaffAction,
  emptyStaffForm,
  initialStaffState,
  isConsoleManaged,
  pendingActionForFocus,
  roleSummary,
  saveStaffAccount,
  staffAccountsReducer,
  type StaffAccountsViewModel,
  type StaffAction,
  type StaffState,
} from "../viewmodels/staff-accounts";
import {
  adminAccount,
  apiError,
  createAdminApiMock,
  createHarness,
  staffAccount,
  staffOptions,
} from "./admin-fixtures";

const actions: StaffAccountsViewModel["actions"] = {
  changeQuery: vi.fn(),
  reload: vi.fn(),
  reloadOptions: vi.fn(),
  dismissNotice: vi.fn(),
  toggleForm: vi.fn(),
  changeForm: vi.fn(),
  changeDepartment: vi.fn(), changeRole: vi.fn(),
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
    items: [staffAccount(), adminAccount()],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 2 },
    options: staffOptions,
    ...overrides,
  };
}

const render = (state: StaffState) =>
  renderToStaticMarkup(<UsersView state={state} actions={actions} />);

const harness = (state: StaffState = readyState()) =>
  createHarness<StaffState, StaffAction>(staffAccountsReducer, state);

function profile(overrides: Partial<StaffProfile>): StaffProfile {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@test.arca.invalid",
    department: null,
    roles: ["executive"],
    permissions: [],
    home: "executive",
    pwa_url: null,
    two_factor_setup_required: false,
    ...overrides,
  };
}

const root = fileURLToPath(new URL("..", import.meta.url));
const source = (path: string) => readFileSync(`${root}/${path}`, "utf8");

function selectOptions(markup: string, id: string): string[] {
  const select = new RegExp(`<select[^>]*id="${id}"[^>]*>([\\s\\S]*?)</select>`).exec(markup);

  return [...(select?.[1] ?? "").matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map(
    (match) => `${match[1]}|${match[2]}`,
  );
}

describe("alta y edición de cuentas (dashboard-017)", () => {
  it("CA-01 fixed-roles-account-management: el selector de rol solo muestra los roles de users/options y nunca admin", () => {
    const markup = render(readyState({ items: [staffAccount()] }));
    const roles = selectOptions(markup, "staff-role");

    expect(roles).toEqual([
      "|Selecciona un rol",
      ...staffOptions.roles.map((role) => `${role.name}|${role.label}`),
    ]);
    expect(selectOptions(markup, "users-filter-role").slice(1)).toEqual(roles.slice(1));
    expect(roles.join("\n")).not.toMatch(/admin|Administrador de Presidencia/);
    expect(staffOptions.roles.map((role) => role.name)).not.toContain("admin");
    expect(markup).not.toContain("Administrador de Presidencia");
    expect(JSON.stringify(readyState().options)).not.toContain('"admin"');
  });

  it("CA-02 fixed-roles-account-management: el rol elegido muestra las secciones que abre según sus permisos", () => {
    expect(sectionsForPermissions(["news.manage", "species.review", "public-content.view"])).toEqual([
      "Noticias",
      "Zoopedia",
    ]);
    expect(roleSummary("communications", staffOptions.roles)?.sections).toEqual([
      "Noticias",
      "Eventos",
      "Momentos",
      "Zoopedia",
    ]);
    expect(roleSummary("admin", staffOptions.roles)).toBeNull();

    const creating = render(
      readyState({ items: [], form: { ...emptyStaffForm(), role: "communications" } }),
    );
    const editing = render(
      readyState({
        items: [],
        editing: staffAccount(),
        form: { ...emptyStaffForm(), role: "cashier" },
      }),
    );

    expect(creating).toContain("Secciones que abre este rol");
    expect(creating).toContain("Noticias, Eventos, Momentos, Zoopedia");
    expect(editing).toContain("Venta, Historial");
    expect(render(readyState({ items: [] }))).not.toContain("Secciones que abre este rol");
  });

  it("CA-03 fixed-roles-account-management: un rol con two_factor_required muestra el aviso de 2FA sin bloquear el envío", () => {
    const withTwoFactor = render(
      readyState({ items: [], form: { ...emptyStaffForm(), role: "executive" } }),
    );
    const without = render(
      readyState({ items: [], form: { ...emptyStaffForm(), role: "cashier" } }),
    );

    expect(roleSummary("executive", staffOptions.roles)?.twoFactorRequired).toBe(true);
    expect(withTwoFactor).toContain(TWO_FACTOR_REQUIRED_NOTE);
    expect(TWO_FACTOR_REQUIRED_NOTE).toBe(
      "Esta cuenta deberá configurar su segundo factor (2FA) al iniciar sesión por primera vez.",
    );
    expect(without).not.toContain(TWO_FACTOR_REQUIRED_NOTE);
    // El botón de envío sigue disponible: la nota no deshabilita nada.
    expect(withTwoFactor).toMatch(/<button[^>]*type="submit"(?![^>]*disabled)[^>]*>\s*Crear usuario/);
  });

  it("CA-04 fixed-roles-account-management: una cuenta admin aparece como gestionada desde consola, sin acciones ni foco de acción", () => {
    const state = readyState();
    const markup = render(state);
    const adminRow = markup.slice(markup.indexOf("Rosa Presidencia"));

    expect(isConsoleManaged(adminAccount())).toBe(true);
    expect(isConsoleManaged(staffAccount())).toBe(false);
    expect(adminRow).toContain(CONSOLE_MANAGED_LABEL);
    expect(CONSOLE_MANAGED_LABEL).toBe("Gestionada desde la consola del servidor");
    for (const action of ["Editar cuenta de Rosa", "cuenta de Rosa", "Restablecer contraseña de Rosa", "Restablecer 2FA de Rosa"]) {
      expect(markup).not.toContain(`aria-label="${action}`);
      expect(markup).not.toMatch(new RegExp(`aria-label="[^"]*${action} Presidencia`));
    }
    expect(adminRow).not.toMatch(/aria-label="(Editar|Activar|Desactivar|Eliminar|Restablecer)[^"]*Rosa/);
    // El buscador global no abre acciones sobre cuentas admin.
    for (const action of ["status", "delete", "reset-password", "reset-two-factor"]) {
      expect(pendingActionForFocus(state.items, { id: 1, action })).toBeNull();
      expect(pendingActionForFocus(state.items, { id: 7, action })).toEqual({ type: action, id: 7 });
    }
  });

  it("CA-05 fixed-roles-account-management: las cuentas no admin conservan las acciones y la confirmación de dashboard-003 y dashboard-015", async () => {
    const markup = render(readyState());

    for (const label of [
      "Editar cuenta de Ana López Pérez",
      "Desactivar cuenta de Ana López Pérez",
      "Restablecer contraseña de Ana López Pérez",
      "Restablecer 2FA de Ana López Pérez",
      "Eliminar cuenta de Ana López Pérez",
    ]) {
      expect(markup).toContain(`aria-label="${label}"`);
    }

    const api = createAdminApiMock();
    const protect = vi.fn(async (run: (password?: string) => Promise<unknown>) => run("Operadora#2026"));
    const h = harness(readyState({ pendingAction: { type: "delete", id: 7 } }));

    await confirmStaffAction(api, h.dispatch, h.state, "", async () => undefined, protect as never);

    expect(protect).toHaveBeenCalledTimes(1);
    expect(api.users.remove).toHaveBeenCalledWith(7);
  });

  it("CA-06 fixed-roles-account-management: un 403 de la API sobre cuenta admin se muestra en el formulario sin cerrar la lista", async () => {
    const message = "Las cuentas de administrador solo se gestionan desde la consola del servidor.";
    const api = createAdminApiMock();
    api.users.create.mockRejectedValueOnce(apiError(403, message));
    const typed = { ...emptyStaffForm(), first_name: "Luis", email: "luis@test.arca.invalid", role: "cashier" };
    const h = harness(readyState({ form: typed }));
    const reload = vi.fn(async () => undefined);

    const ok = await saveStaffAccount(api, h.dispatch, h.state, reload);

    expect(ok).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(h.state.formError).toBe(message);
    expect(h.state.items).toHaveLength(2);
    expect(h.state.form.first_name).toBe("Luis");
    expect(render(h.state)).toContain(message);
  });
});

describe("navegación, inicio y etiquetas (dashboard-017)", () => {
  it("CA-09 fixed-roles-account-management: executive se muestra como «Consulta directiva» y no aparece «Ejecutivo» ni «Panel ejecutivo»", () => {
    const app = source("App.tsx");
    const markup = render(readyState());
    const executive = profile({ permissions: ["dashboard.view", "reports.view"] });

    expect(app).toContain('"Consulta directiva"');
    expect(app).not.toContain("Panel ejecutivo");
    expect(markup).toContain(">Consulta directiva</option>");
    expect(markup).toContain(">Comunicación</option>");
    expect(markup).not.toMatch(/Ejecutivo|Panel ejecutivo/);
    expect(getNavigationForProfile(executive).map((item) => item.label)).toEqual([
      "Panel principal",
      "Reportes",
    ]);
  });
});

describe("calidad (dashboard-017)", () => {
  it("CA-14 fixed-roles-account-management: vistas nuevas con foco visible, tabla con desplazamiento propio y banner accesible", async () => {
    const table = render(readyState());
    const css = source("styles.css");

    // Avisos de consola: emergentes con role="status" y botón «Cerrar aviso» (dashboard-017 rev. 2026-11-21).
    expect(source("components/DashboardNotifications.tsx")).toContain('"status"');
    expect(source("components/DashboardNotifications.tsx")).toContain('aria-label="Cerrar aviso"');
    expect(table).toContain("data-table-scroll");
    expect(table).toMatch(/data-table-scroll[^>]*tabindex="0"/);
  });

  it("CA-15 fixed-roles-account-management: ningún componente de views/ o components/ usa fetch ni axios y ninguno decide permisos por nombre de rol", () => {
    const files = [
      ...readdirSync(`${root}/views`).map((name) => `views/${name}`),
      ...readdirSync(`${root}/components`)
        .filter((name) => name.endsWith(".tsx"))
        .map((name) => `components/${name}`),
    ];

    for (const file of files) {
      const text = source(file);

      expect(text, file).not.toMatch(/\bfetch\s*\(/);
      expect(text, file).not.toMatch(/\baxios\b/);
    }
    for (const file of ["views/UsersView.tsx", "components/ConsoleNoticesPublisher.tsx"]) {
      expect(source(file), file).not.toMatch(/["'](admin|zoo-admin|executive|communications)["']/);
      expect(source(file), file).not.toMatch(/@arca\/api-client|@\/services\//);
    }
    expect(source("viewmodels/useConsoleNotices.ts")).toContain("adminApi");
  });
});
