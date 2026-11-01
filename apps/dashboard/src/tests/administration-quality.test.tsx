import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createAdminApi, createHttpClient } from "@arca/api-client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { UsersView } from "../views/UsersView";
import {
  authSessionReducer,
  initialAuthSessionState,
  type AuthSessionState,
} from "../viewmodels/auth-session";
import {
  confirmStaffDialog,
  initialStaffState,
  loadStaffAccounts,
  staffAccountsReducer,
  type StaffAccountsViewModel,
  type StaffAction,
  type StaffState,
} from "../viewmodels/staff-accounts";
import { apiError, createAdminApiMock, createHarness, staffAccount, staffOptions } from "./admin-fixtures";

const srcDirectory = fileURLToPath(new URL("..", import.meta.url));

function sourcesIn(directory: string): { file: string; source: string }[] {
  return readdirSync(`${srcDirectory}${directory}`)
    .filter((file) => file.endsWith(".tsx"))
    .map((file) => ({
      file: `${directory}/${file}`,
      source: readFileSync(`${srcDirectory}${directory}/${file}`, "utf8"),
    }));
}

const presentationFiles = [
  ...sourcesIn("views"),
  ...sourcesIn("components"),
  ...sourcesIn("sections"),
];
const styles = readFileSync(`${srcDirectory}styles.css`, "utf8");
const sectionStyles = styles.slice(styles.indexOf("dashboard-003"));

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

describe("CA-14 administration-sections", () => {
  it("mantiene fetch, axios, servicios y @arca/api-client fuera de views, components y sections", () => {
    expect(presentationFiles.length).toBeGreaterThan(10);

    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\baxios\b/);
      // Se admiten imports de solo tipos preexistentes (p. ej. TwoFactorChallenge de dashboard-002).
      expect(source, file).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@arca\/api-client["']/m);
      expect(source, file).not.toMatch(/from\s+["'](?:@|\.\.?)\/services\//);
    }
  });

  it("no calculan totales ni permisos en views, components o sections", () => {
    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\.reduce\(/);
      expect(source, file).not.toMatch(/\bpermissions\b/);
    }
  });

  it("tiene un hook ViewModel por sección que usa el cliente de @arca/api-client", () => {
    const hooks = [
      "useStaffAccounts",
      "useNewsManagement",
      "useEventsManagement",
      "useEnclosuresManagement",
      "useDashboardSummary",
      "useTicketReport",
    ];

    for (const hook of hooks) {
      const source = readFileSync(`${srcDirectory}viewmodels/${hook}.ts`, "utf8");

      expect(source, hook).toContain('from "@/services/arca-api"');
      expect(source, hook).toContain("adminApi");
    }
    const services = readFileSync(`${srcDirectory}services/arca-api.ts`, "utf8");

    expect(services).toContain("createAdminApi");
  });
});

describe("CA-15 administration-sections", () => {
  it("un 401 en una sección dispara el manejador global y vuelve al login con «Tu sesión expiró»", async () => {
    let session: AuthSessionState = { ...initialAuthSessionState, status: "authenticated" };
    const onUnauthorized = vi.fn(() => {
      session = authSessionReducer(session, { type: "unauthorized", sessionExpired: true });
    });
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ message: "Unauthenticated." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    const api = createAdminApi(createHttpClient({ baseUrl: "", fetchImpl, onUnauthorized }));
    const h = createHarness<typeof initialStaffState, StaffAction>(staffAccountsReducer, initialStaffState);

    await loadStaffAccounts(api, h.dispatch, h.state.query);

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(session.status).toBe("anonymous");
    expect(session.sessionExpired).toBe(true);
    expect(session.error).toContain("Tu sesión expiró");
    // El ViewModel no duplica el aviso: no muestra un error propio de la sección.
    expect(h.state.error).toBe("");
    expect(h.state.actionError).toBe("");
  });

  it("las operaciones de escritura tampoco muestran mensajes propios ante un 401", async () => {
    const api = createAdminApiMock();
    api.users.remove.mockRejectedValueOnce(apiError(401, "Unauthenticated."));
    const h = createHarness<typeof initialStaffState, StaffAction>(staffAccountsReducer, initialStaffState);

    await confirmStaffDialog(
      api,
      h.dispatch,
      { kind: "delete", account: staffAccount() },
      "",
      async () => undefined,
    );

    expect(h.state.actionError).toBe("");
    expect(h.state.saving).toBe(false);
  });
});

describe("CA-16 administration-sections", () => {
  const state: StaffState = {
    ...initialStaffState,
    status: "ready",
    items: [staffAccount()],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 },
    options: staffOptions,
  };
  const render = (overrides: Partial<StaffState> = {}) =>
    renderToStaticMarkup(<UsersView state={{ ...state, ...overrides }} actions={actions} />);

  it("etiqueta los diálogos con aria-labelledby y los controles con label", () => {
    const form = render({ dialog: { kind: "create" } });
    const confirmation = render({ dialog: { kind: "delete", account: staffAccount() } });

    expect(form).toContain('aria-labelledby="dialog-title-crear-usuario"');
    expect(form).toContain('id="dialog-title-crear-usuario"');
    expect(confirmation).toContain('aria-labelledby="dialog-title-eliminar-cuenta"');
    for (const id of ["staff-first_name", "staff-last_name", "staff-email", "staff-role", "users-search"]) {
      expect(form).toContain(`for="${id}"`);
    }
  });

  it("usa role=alert y role=status, y no duplica identificadores de diálogo cerrados", () => {
    const failed = render({ status: "error", error: "Falló la carga." });
    const notice = render({ notice: "Listo." });
    const closed = render();
    const ids = [...closed.matchAll(/id="(dialog-title-[^"]*)"/g)].map((match) => match[1]);

    expect(failed).toContain('role="alert"');
    expect(notice).toContain('role="status"');
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("coloca las tablas en un contenedor desplazable con nombre y foco por teclado", () => {
    const markup = renderToStaticMarkup(
      <DataTable
        caption="Tabla de prueba"
        columns={[{ key: "a", header: "Columna", render: (row: { a: string }) => row.a }]}
        rows={[{ a: "x" }]}
        rowKey={(row) => row.a}
      />,
    );

    expect(markup).toContain("table-scroll");
    expect(markup).toContain('role="region"');
    expect(markup).toContain('aria-label="Tabla de prueba"');
    expect(markup).toContain('tabindex="0"');
    expect(markup).toContain('data-label="Columna"');
  });

  it("el diálogo de confirmación nombra el efecto y usa un formulario con botones etiquetados", () => {
    const markup = renderToStaticMarkup(
      <ConfirmDialog
        copy={{ title: "Eliminar cuenta", message: "¿Eliminar?", confirmLabel: "Eliminar cuenta", danger: true }}
        idleTitle="Confirmar"
        busy={false}
        error="No se pudo."
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("<dialog");
    expect(markup).toContain("Cancelar");
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('type="submit"');
  });

  it("define foco visible, desplazamiento propio y diseño apilado en pantallas angostas", () => {
    expect(styles).toContain(":focus-visible");
    expect(sectionStyles).toMatch(/\.data-table-scroll:focus-visible/);
    expect(styles).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(sectionStyles).toMatch(/@media \(max-width: 640px\)[\s\S]*\.data-table td::before/);
    expect(sectionStyles).toContain("attr(data-label)");
  });
});

describe("CA-17 administration-sections", () => {
  it("no fija hex de marca en las vistas, componentes y estilos nuevos", () => {
    expect(sectionStyles.length).toBeGreaterThan(500);

    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/#[\da-f]{3,8}\b/i);
    }
    expect(sectionStyles).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(sectionStyles).toContain("var(--danger)");
    expect(sectionStyles).toContain("var(--border)");
  });
});
