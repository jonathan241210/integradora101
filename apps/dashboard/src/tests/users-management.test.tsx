import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHttpClient,
  createUsersApi,
  type HttpClient,
} from "@arca/api-client";
import type { StaffUser, StaffUserCatalog } from "@arca/api-client";
import { UsersView } from "../views/UsersView";
import {
  getUsersErrorMessage,
  type UsersViewModelState,
} from "../viewmodels/useUsers";
import { getNavigationForProfile } from "../viewmodels/navigation";

afterEach(() => vi.unstubAllGlobals());

const user: StaffUser = {
  id: 12,
  first_name: "Ana",
  last_name: "López",
  second_last_name: null,
  full_name: "Ana López",
  email: "ana@example.test",
  department: { id: 2, code: "box-office", name: "Taquilla" },
  roles: ["cashier"],
  is_active: true,
};

const catalog: StaffUserCatalog = {
  departments: [
    {
      id: 2,
      code: "box-office",
      name: "Taquilla",
      suggested_role: "cashier",
    },
  ],
  roles: [{ name: "cashier", label: "Cajero" }],
};

function state(overrides: Partial<UsersViewModelState> = {}): UsersViewModelState {
  return {
    status: "ready",
    users: [user],
    catalog,
    error: "",
    notice: "",
    fieldErrors: {},
    submitting: false,
    deactivatingId: null,
    ...overrides,
  };
}

function renderUsers(overrides: Partial<UsersViewModelState> = {}) {
  return renderToStaticMarkup(
    <UsersView
      title="Gestión de usuarios"
      state={state(overrides)}
      onSave={vi.fn()}
      onDeactivate={vi.fn()}
      onRetry={vi.fn()}
      onClearNotice={vi.fn()}
    />,
  );
}

function profile(permissions: string[]) {
  return {
    id: 1,
    first_name: "Personal",
    last_name: "Prueba",
    second_last_name: null,
    full_name: "Personal Prueba",
    email: "personal@example.test",
    department: null,
    roles: [],
    permissions,
    home: "administration" as const,
    pwa_url: null,
    two_factor_setup_required: false,
  };
}

/** CA-01 user-management */
describe("CA-01 user-management", () => {
  it("muestra navegación general y de taquilla según permisos sin duplicar secciones", () => {
    const admin = getNavigationForProfile(profile(["users.manage", "operational-staff.manage"]));
    const zooAdmin = getNavigationForProfile(profile(["operational-staff.manage"]));
    const cashier = getNavigationForProfile({
      ...profile(["users.manage"]),
      home: "ticket",
    });

    expect(admin.map((item) => item.id)).toContain("users");
    expect(admin.map((item) => item.id)).not.toContain("ticket-users");
    expect(zooAdmin.map((item) => item.id)).toContain("ticket-users");
    expect(zooAdmin.map((item) => item.id)).not.toContain("users");
    expect(zooAdmin.find((item) => item.id === "ticket-users")?.label).toBe("Personal operativo");
    expect(cashier.map((item) => item.id)).not.toContain("users");
  });
});

/** CA-02 user-management */
describe("CA-02 user-management", () => {
  it("presenta estados de carga, vacío, error y reintento", () => {
    const loading = renderUsers({ status: "loading", users: [], catalog: null });
    const empty = renderUsers({ users: [] });
    const failed = renderUsers({ status: "error", error: "No fue posible cargar." });

    expect(loading).toContain("Cargando cuentas y catálogo");
    expect(empty).toContain("No hay cuentas de personal");
    expect(failed).toContain('role="alert"');
    expect(failed).toContain("Reintentar");
  });
});

/** CA-03 user-management */
describe("CA-03 user-management", () => {
  it("muestra catálogo etiquetado y campos accesibles para alta", async () => {
    const markup = renderUsers();
    const http = {
      request: vi.fn(),
      get: vi.fn()
        .mockResolvedValueOnce({ data: [user] })
        .mockResolvedValueOnce({ data: catalog }),
      post: vi.fn().mockResolvedValue({ data: user }),
      delete: vi.fn(),
      setOnUnauthorized: vi.fn(),
    } as unknown as HttpClient;
    const api = createUsersApi(http);

    expect(markup).toContain("Gestión de usuarios");
    expect(markup).toContain('for="staff-user-first-name"');
    expect(markup).toContain("Taquilla");
    expect(markup).toContain("Cajero");
    expect(markup).toContain('type="password"');
    expect(markup).toContain('aria-label="Mostrar contraseña"');
    await expect(api.list()).resolves.toEqual([user]);
    await expect(api.catalog()).resolves.toEqual(catalog);
    await expect(api.create({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      department_id: 2,
      role: "cashier",
      password: "SafePassphrase12!",
    })).resolves.toEqual(user);
    expect(http.post).toHaveBeenCalledWith("/api/v1/staff-users", expect.objectContaining({ role: "cashier" }));
  });
});

/** CA-04 user-management */
describe("CA-04 user-management", () => {
  it("presenta edición y envía únicamente los campos incluidos en PATCH", async () => {
    const request = vi.fn().mockResolvedValue({ data: user });
    const api = createUsersApi({
      request,
      get: vi.fn(),
      post: vi.fn(),
      delete: vi.fn(),
      setOnUnauthorized: vi.fn(),
    } as unknown as HttpClient);
    const markup = renderToStaticMarkup(
      <UsersView
        title="Gestión de usuarios"
        state={state()}
        onSave={async () => true}
        onDeactivate={vi.fn()}
        onRetry={vi.fn()}
        onClearNotice={vi.fn()}
      />,
    );

    expect(markup).toContain("Editar");
    expect(markup).toContain("Crear cuenta");
    await expect(api.update(12, { first_name: "Ana María" })).resolves.toEqual(user);
    expect(request).toHaveBeenCalledWith("/api/v1/staff-users/12", {
      method: "PATCH",
      body: { first_name: "Ana María" },
    });
  });
});

/** CA-05 user-management */
describe("CA-05 user-management", () => {
  it("presenta la confirmación accesible antes de desactivar", () => {
    const markup = renderUsers();

    expect(markup).toContain('aria-labelledby="dialog-title-desactivar-cuenta"');
    expect(markup).toContain("La persona ya no podrá iniciar sesión");
    expect(markup).toContain("Confirmar desactivación");
  });
});

/** CA-06 user-management */
describe("CA-06 user-management", () => {
  it("traduce respuestas de validación, autorización y límite", () => {
    expect(getUsersErrorMessage({ status: 422 })).toContain("Revisa los datos");
    expect(getUsersErrorMessage({ status: 403, message: "No autorizado." })).toBe("No autorizado.");
    expect(getUsersErrorMessage({ status: 429, message: "Espera 4 segundos." })).toContain("Espera");
    expect(getUsersErrorMessage({ status: 401 })).toBe("");
  });
});

/** CA-07 user-management */
describe("CA-07 user-management", () => {
  it("usa endpoints nombrados, reintenta PATCH tras 419 y acepta 204", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=inicial" });
    const requestOptions: RequestInit[] = [];
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/sanctum/csrf-cookie")) {
        document.cookie = "XSRF-TOKEN=renovado";
        return new Response(null, { status: 204 });
      }
      requestOptions.push(init ?? {});
      if (init?.method === "PATCH" && requestOptions.filter((request) => request.method === "PATCH").length === 1) {
        return new Response("", { status: 419 });
      }
      if (init?.method === "PATCH") {
        return new Response(JSON.stringify({ data: user }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(null, { status: 204 });
    });
    const api = createUsersApi(createHttpClient({
      baseUrl: "https://api.example.test",
      fetchImpl,
    }));

    await expect(api.update(12, { first_name: "Ana María" })).resolves.toEqual(user);
    await expect(api.deactivate(12)).resolves.toBeUndefined();

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(requestOptions[0]?.method).toBe("PATCH");
    expect(new Headers(requestOptions[0]?.headers).get("X-XSRF-TOKEN")).toBe("inicial");
    expect(requestOptions[1]?.method).toBe("PATCH");
    expect(new Headers(requestOptions[1]?.headers).get("X-XSRF-TOKEN")).toBe("renovado");
    expect(requestOptions[2]?.method).toBe("DELETE");
  });
});

/** CA-08 user-management */
describe("CA-08 user-management", () => {
  it("usa tabla desplazable y tokens semánticos sin banner demostrativo", () => {
    const markup = renderUsers();
    const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

    expect(markup).toContain('role="region" tabindex="0" aria-label="Tabla desplazable de cuentas"');
    expect(markup).toContain('scope="col"');
    expect(markup).not.toContain("Prototipo de demostración");
    expect(styles).toContain("var(--surface)");
    expect(styles).toContain("overflow-x: auto");
    expect(styles).toContain("@media (max-width: 1080px)");
  });
});

/** CA-09 user-management */
describe("CA-09 user-management", () => {
  it("mantiene un test nombrado para cada criterio de dashboard-003", () => {
    const source = readdirSync(new URL(".", import.meta.url))
      .filter((filename) => filename.endsWith(".test.tsx"))
      .map((filename) => readFileSync(new URL(filename, import.meta.url), "utf8"))
      .join("\n");

    for (let criterion = 1; criterion <= 9; criterion += 1) {
      expect(source).toContain(`CA-${String(criterion).padStart(2, "0")} user-management`);
    }
  });
});
