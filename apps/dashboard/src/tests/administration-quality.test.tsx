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
  confirmStaffAction,
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
    const h = createHarness<typeof initialStaffState, StaffAction>(staffAccountsReducer, {
      ...initialStaffState,
      items: [staffAccount()],
      pendingAction: { type: "delete", id: 7 },
    });

    await confirmStaffAction(api, h.dispatch, h.state, "", async () => undefined);

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

  it("etiqueta el panel y las confirmaciones en línea y los controles con label", () => {
    const form = render();
    const confirmation = render({ pendingAction: { type: "delete", id: 7 } });

    expect(form).toContain('aria-labelledby="staff-form-title"');
    expect(form).toContain('id="staff-form-title"');
    expect(confirmation).toContain('aria-label="Confirmar eliminar la cuenta de Ana López Pérez"');
    for (const id of ["staff-first_name", "staff-last_name", "staff-email", "staff-role", "users-search"]) {
      expect(form).toContain(`for="${id}"`);
    }
  });

  it("usa role=alert y role=status, y no duplica identificadores", () => {
    const failed = render({ status: "error", error: "Falló la carga." });
    const notice = render({ notice: "Listo." });
    const closed = render();
    const ids = [...closed.matchAll(/id="([^"]*)"/g)].map((match) => match[1]);

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

const inlineStyles = styles.slice(styles.indexOf("dashboard-004 · inline-content-forms"));
const inlineFiles = presentationFiles.filter(({ file }) =>
  /(NewsView|EventsView|UsersView|FormPanel|FormField|InlineConfirm|InlinePasswordReset|InlineFormFooter|ImageUploadBox|ContentCardActions|ContentThumbnail|DataTable)\.tsx$/.test(file),
);

describe("CA-16 inline-content-forms", () => {
  it("views, components y sections no usan fetch, axios, @arca/api-client, servicios ni URL", () => {
    expect(inlineFiles.length).toBeGreaterThanOrEqual(10);

    for (const { file, source } of presentationFiles) {
      expect(source, file).not.toMatch(/\bfetch\s*\(/);
      expect(source, file).not.toMatch(/\baxios\b/);
      expect(source, file).not.toMatch(/^import\s+(?!type\b)[^;]*from\s+["']@arca\/api-client["']/m);
      expect(source, file).not.toMatch(/from\s+["'](?:@|\.\.?)\/services\//);
      expect(source, file).not.toMatch(/\bURL\.(?:create|revoke)ObjectURL\b/);
      expect(source, file).not.toMatch(/\.reduce\(|\bpermissions\b/);
    }
  });

  it("el envío, la vista previa y las acciones pasan por hooks ViewModel que usan adminApi y image-preview", () => {
    for (const hook of ["useNewsManagement", "useEventsManagement"]) {
      const source = readFileSync(`${srcDirectory}viewmodels/${hook}.ts`, "utf8");

      expect(source, hook).toContain('from "@/services/arca-api"');
      expect(source, hook).toContain('from "@/services/image-preview"');
      expect(source, hook).toContain("adminApi");
    }
    const preview = readFileSync(`${srcDirectory}services/image-preview.ts`, "utf8");

    expect(preview).toContain("URL.createObjectURL");
    expect(preview).toContain("URL.revokeObjectURL");
  });
});

describe("CA-17 inline-content-forms", () => {
  it("package.json del dashboard no suma dependencias respecto de dashboard-003", () => {
    const manifest = JSON.parse(readFileSync(`${srcDirectory}../package.json`, "utf8")) as {
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    };

    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      "@arca/api-client",
      "@arca/tokens",
      "@arca/ui",
      "react",
      "react-dom",
    ]);
    expect(Object.keys(manifest.devDependencies).sort()).toEqual([
      "@tailwindcss/vite",
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "tailwindcss",
      "typescript",
      "vite",
      "vitest",
    ]);
  });
});

describe("CA-18 inline-content-forms", () => {
  it("formularios, caja de imagen, tarjetas y tabla se apilan o desplazan sin desbordar la página", () => {
    expect(inlineStyles.length).toBeGreaterThan(500);
    expect(inlineStyles).toMatch(/@media \(max-width: 560px\)[\s\S]*\.form-field--wide[\s\S]*grid-column:\s*1 \/ -1/);
    expect(inlineStyles).toMatch(/\.upload-box__preview\s*\{[^}]*max-width:\s*260px/s);
    expect(inlineStyles).toMatch(/\.content-card__thumb\s*\{[^}]*width:\s*100%/s);
    expect(inlineStyles).toMatch(/\.form-panel__header\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(inlineStyles).toMatch(/\.inline-confirm__actions\s*\{[^}]*flex-wrap:\s*wrap/s);
    expect(inlineStyles).toMatch(/@media \(max-width: 640px\)[\s\S]*\.data-table__detail td/);
    expect(styles).toMatch(/\.table-scroll\s*\{[^}]*overflow-x:\s*auto/s);
    expect(styles).toMatch(/\.upload-box:focus-within\s*\{[^}]*outline/s);
  });

  it("la fila de detalle de la tabla ocupa todo el ancho bajo la fila", () => {
    const markup = renderToStaticMarkup(
      <DataTable
        caption="Tabla"
        columns={[{ key: "a", header: "A", render: (row: { a: string }) => row.a }, { key: "b", header: "B", render: () => "b" }]}
        rows={[{ a: "x" }, { a: "y" }]}
        rowKey={(row) => row.a}
        rowDetail={(row) => (row.a === "x" ? <p>detalle</p> : null)}
      />,
    );

    expect(markup).toContain('class="data-table__detail"');
    expect(markup).toContain('colSpan="2"');
    expect(markup.match(/data-table__detail/g)).toHaveLength(1);
  });
});

describe("CA-19 inline-content-forms", () => {
  it("el estilo nuevo usa tokens semánticos y no fija colores de marca en hexadecimal", () => {
    expect(inlineStyles).not.toMatch(/#[\da-f]{3,8}\b/i);
    expect(inlineStyles).not.toMatch(/\brgba?\(|\bhsla?\(/i);
    expect(inlineStyles).toContain("var(--border)");
    expect(inlineStyles).toContain("var(--primary)");
    expect(inlineStyles).toContain("var(--surface-subtle)");

    for (const { file, source } of inlineFiles) {
      expect(source, file).not.toMatch(/#[\da-f]{3,8}\b/i);
    }
  });
});
