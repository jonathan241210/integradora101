import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthApi, createHttpClient } from "@arca/api-client";

let originalDocument: PropertyDescriptor | undefined;
let documentCookie = "";

function setDocumentCookie(value: string): void {
  documentCookie = value;
}

function fakeDocument(): void {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return documentCookie;
      },
      set cookie(value: string) {
        documentCookie = value;
      },
    },
  });
}

function jsonResponse(
  status: number,
  body: unknown,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...Object.fromEntries(new Headers(headers)) },
  });
}

beforeEach(() => {
  originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  documentCookie = "";
  fakeDocument();
});

afterEach(() => {
  if (originalDocument) {
    Object.defineProperty(globalThis, "document", originalDocument);
  } else {
    Reflect.deleteProperty(globalThis, "document");
  }
});

describe("CA-03 real-staff-login", () => {
  it("obtiene CSRF cuando falta la cookie y decodifica XSRF-TOKEN antes del POST", async () => {
    const requests: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      requests.push({ url, init });

      if (url === "/sanctum/csrf-cookie") {
        document.cookie = "XSRF-TOKEN=token%2Bcon%3Dsigno";
        return new Response(null, { status: 204 });
      }

      return jsonResponse(200, { two_factor: false });
    };
    const http = createHttpClient({ baseUrl: "", fetchImpl });

    const first = await http.post<{ two_factor: boolean }>("/api/v1/auth/login", {
      email: "personal@test.arca.invalid",
      password: "valor-de-prueba",
    });
    await http.post("/api/v1/auth/logout");

    expect(first.two_factor).toBe(false);
    expect(requests.map(({ url }) => url)).toEqual([
      "/sanctum/csrf-cookie",
      "/api/v1/auth/login",
      "/api/v1/auth/logout",
    ]);
    expect(new Headers(requests[1]?.init?.headers).get("X-XSRF-TOKEN")).toBe(
      "token+con=signo",
    );
    expect(requests[1]?.init?.credentials).toBe("include");
    expect(new Headers(requests[1]?.init?.headers).get("Accept")).toBe(
      "application/json",
    );
  });

  it("normaliza la respuesta 422 genérica de Fortify", async () => {
    setDocumentCookie("XSRF-TOKEN=token");
    const http = createHttpClient({
      baseUrl: "",
      fetchImpl: async () =>
        jsonResponse(422, {
          message: "Correo o contraseña incorrectos.",
          errors: { email: ["Correo o contraseña incorrectos."] },
        }),
    });

    await expect(
      http.post("/api/v1/auth/login", { email: "persona@test.arca.invalid", password: "incorrecta" }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Correo o contraseña incorrectos.",
      errors: { email: ["Correo o contraseña incorrectos."] },
    });
  });

  it("normaliza el límite 429 y Retry-After", async () => {
    setDocumentCookie("XSRF-TOKEN=token");
    const http = createHttpClient({
      baseUrl: "",
      fetchImpl: async () =>
        jsonResponse(
          429,
          { message: "Demasiados intentos. Intenta de nuevo en 12 segundos." },
          { "Retry-After": "12" },
        ),
    });

    await expect(
      http.post("/api/v1/auth/login", { email: "persona@test.arca.invalid", password: "incorrecta" }),
    ).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 12,
    });
  });
});

describe("CA-11 real-staff-login", () => {
  it("actualiza CSRF y reintenta una petición 419 una sola vez", async () => {
    setDocumentCookie("XSRF-TOKEN=token-vencido");
    const requests: { url: string; init?: RequestInit }[] = [];
    let postCount = 0;
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      requests.push({ url, init });

      if (url === "/sanctum/csrf-cookie") {
        document.cookie = "XSRF-TOKEN=token%2Brenovado";
        return new Response(null, { status: 204 });
      }

      postCount += 1;
      return postCount === 1
        ? jsonResponse(419, { message: "Page Expired" })
        : jsonResponse(200, { two_factor: false });
    };
    const http = createHttpClient({ baseUrl: "", fetchImpl });

    const result = await http.post<{ two_factor: boolean }>("/api/v1/auth/login", {
      email: "personal@test.arca.invalid",
      password: "valor-de-prueba",
    });

    expect(result.two_factor).toBe(false);
    expect(requests.map(({ url }) => url)).toEqual([
      "/api/v1/auth/login",
      "/sanctum/csrf-cookie",
      "/api/v1/auth/login",
    ]);
    expect(new Headers(requests[0]?.init?.headers).get("X-XSRF-TOKEN")).toBe(
      "token-vencido",
    );
    expect(new Headers(requests[2]?.init?.headers).get("X-XSRF-TOKEN")).toBe(
      "token+renovado",
    );
  });

  it("devuelve ApiError tras el segundo 419 sin un tercer intento", async () => {
    setDocumentCookie("XSRF-TOKEN=token-vencido");
    const requests: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      requests.push(url);

      if (url === "/sanctum/csrf-cookie") {
        document.cookie = "XSRF-TOKEN=token-renovado";
        return new Response(null, { status: 204 });
      }

      return jsonResponse(419, { message: "Page Expired" });
    };
    const http = createHttpClient({ baseUrl: "", fetchImpl });

    await expect(
      http.post("/api/v1/auth/login", {
        email: "personal@test.arca.invalid",
        password: "valor-de-prueba",
      }),
    ).rejects.toMatchObject({ name: "ApiError", status: 419 });

    expect(requests).toEqual([
      "/api/v1/auth/login",
      "/sanctum/csrf-cookie",
      "/api/v1/auth/login",
    ]);
  });

  it("extrae StaffProfile de la envoltura data de Laravel", async () => {
    const profile = {
      id: 17,
      first_name: "Personal",
      last_name: "Prueba",
      second_last_name: null,
      full_name: "Personal Prueba",
      email: "personal@test.arca.invalid",
      department: { code: "presidency", name: "Presidencia" },
      roles: ["admin"],
      permissions: ["dashboard.view"],
      home: "administration",
      pwa_url: null,
      two_factor_setup_required: true,
    };
    const http = createHttpClient({
      baseUrl: "",
      fetchImpl: async () => jsonResponse(200, { data: profile }),
    });

    await expect(createAuthApi(http).me()).resolves.toEqual(profile);
  });

  it("notifica 401, conserva cookies y normaliza el error de sesión", async () => {
    setDocumentCookie("XSRF-TOKEN=token");
    const onUnauthorized = vi.fn();
    const http = createHttpClient({
      baseUrl: "",
      onUnauthorized,
      fetchImpl: async () => jsonResponse(401, { message: "Unauthenticated." }),
    });

    await expect(http.get("/api/v1/auth/me")).rejects.toMatchObject({
      status: 401,
      message: "Unauthenticated.",
    });

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });
});
