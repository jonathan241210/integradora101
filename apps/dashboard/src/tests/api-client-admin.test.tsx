import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminApi, createHttpClient, filenameFromDisposition } from "@arca/api-client";

let originalDocument: PropertyDescriptor | undefined;
let documentCookie = "";

beforeEach(() => {
  originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  documentCookie = "";
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
});

afterEach(() => {
  if (originalDocument) {
    Object.defineProperty(globalThis, "document", originalDocument);
  } else {
    Reflect.deleteProperty(globalThis, "document");
  }
});

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

type Call = { url: string; init?: RequestInit };

function clientWith(
  respond: (call: Call, index: number) => Response | Promise<Response>,
  onUnauthorized?: () => void,
) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const call = { url: String(input), init };
    calls.push(call);

    if (call.url === "/sanctum/csrf-cookie") {
      documentCookie = "XSRF-TOKEN=token%2Bcsrf";
      return new Response(null, { status: 204 });
    }

    return respond(call, calls.length - 1);
  };

  return { calls, http: createHttpClient({ baseUrl: "", fetchImpl, onUnauthorized }) };
}

describe("CA-12 administration-sections", () => {
  it("download pide el archivo con cookies, devuelve blob y nombre saneado", async () => {
    const { http, calls } = clientWith(
      () =>
        new Response("folio,total\n", {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="../../etc/reporte-boletos.csv"',
          },
        }),
    );

    const file = await http.download("/api/v1/admin/reports/tickets/export?format=csv");

    expect(calls[0].url).toBe("/api/v1/admin/reports/tickets/export?format=csv");
    expect(calls[0].init?.credentials).toBe("include");
    expect(calls[0].init?.method).toBe("GET");
    expect(file.filename).toBe("reporte-boletos.csv");
    expect(await file.blob.text()).toBe("folio,total\n");
  });

  it("download lanza ApiError con el JSON de error cuando el formato no está disponible", async () => {
    const { http } = clientWith(() =>
      json(422, { message: "Formato de exportación no disponible." }),
    );

    await expect(http.download("/api/v1/admin/reports/tickets/export?format=pdf")).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Formato de exportación no disponible.",
    });
  });

  it("exportTickets arma la ruta con el periodo visible y el formato", async () => {
    const { http, calls } = clientWith(
      () => new Response("x", { status: 200, headers: { "Content-Disposition": "attachment; filename=r.csv" } }),
    );
    const api = createAdminApi(http, { deviceTimeZone: () => undefined });

    const file = await api.reports.exportTickets(
      { period: "month", date: "2026-09-15", page: 4 },
      "csv",
    );

    expect(calls[0].url).toBe(
      "/api/v1/admin/reports/tickets/export?period=month&date=2026-09-15&format=csv",
    );
    expect(file.filename).toBe("r.csv");
  });
});

describe("CA-14 administration-sections", () => {
  it("patch y put envían XSRF decodificado y cuerpo JSON", async () => {
    const { http, calls } = clientWith(() => json(200, { data: { id: 7 } }));
    documentCookie = "XSRF-TOKEN=abc%2B123";

    await http.patch("/api/v1/admin/users/7", { role: "cashier" });
    await http.put("/api/v1/admin/users/7/password", { password: "Secreta#123" });

    expect(calls[0].init?.method).toBe("PATCH");
    expect(calls[1].init?.method).toBe("PUT");
    expect(new Headers(calls[0].init?.headers).get("X-XSRF-TOKEN")).toBe("abc+123");
    expect(new Headers(calls[0].init?.headers).get("Content-Type")).toBe("application/json");
    expect(calls[0].init?.body).toBe(JSON.stringify({ role: "cashier" }));
    expect(calls[1].init?.body).toBe(JSON.stringify({ password: "Secreta#123" }));
  });

  it("obtiene la cookie CSRF cuando falta y reintenta una vez tras un 419", async () => {
    let attempts = 0;
    const { http, calls } = clientWith(() => {
      attempts += 1;
      return attempts === 1 ? json(419, { message: "CSRF token mismatch." }) : json(200, {});
    });

    await http.patch("/api/v1/admin/users/7/status", { is_active: false });

    expect(calls.map((call) => call.url)).toEqual([
      "/sanctum/csrf-cookie",
      "/api/v1/admin/users/7/status",
      "/sanctum/csrf-cookie",
      "/api/v1/admin/users/7/status",
    ]);
  });

  it("avisa un 401 y conserva el error 422 con su cuerpo JSON por campo", async () => {
    const onUnauthorized = vi.fn();
    const unauthorized = clientWith(() => json(401, { message: "Unauthenticated." }), onUnauthorized);

    await expect(unauthorized.http.put("/x", {})).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledOnce();

    const invalid = clientWith(() =>
      json(422, { message: "Los datos no son válidos.", errors: { email: ["Correo repetido."] } }),
    );
    await expect(invalid.http.patch("/x", {})).rejects.toMatchObject({
      status: 422,
      errors: { email: ["Correo repetido."] },
    });
  });

  it("createAdminApi normaliza listas y el reporte, y no cambia las firmas existentes", async () => {
    const { http, calls } = clientWith((call) => {
      if (call.url.startsWith("/api/v1/admin/reports/tickets")) {
        return json(200, {
          data: {
            period: { type: "week", from: "2026-10-26", to: "2026-11-01", label: "Semana", previous_date: null, next_date: null },
            totals: { tickets: 120, adults: 80, children: 40, revenue: "6000.00" },
            daily: [],
            tickets: [{ folio: "F-1", purchased_at: "2026-10-26 10:00:00", adults: 1, children: 0, total: "50.00" }],
          },
          meta: { current_page: 2, last_page: 3, per_page: 50, total: 120 },
        });
      }
      if (call.url.startsWith("/api/v1/admin/news")) return json(200, { data: [{ id: 1 }] });
      return json(200, { data: [{ id: 1 }], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1 } });
    });
    const api = createAdminApi(http, { deviceTimeZone: () => undefined });

    const report = await api.reports.tickets({ period: "week", page: 2 });
    const news = await api.news.list();
    const users = await api.users.list({ search: "ana", role: "", page: 1 });

    expect(report.tickets).toHaveLength(1);
    expect(report.meta).toEqual({ current_page: 2, last_page: 3, per_page: 50, total: 120 });
    expect(news).toEqual([{ id: 1 }]);
    expect(users.meta.total).toBe(1);
    expect(calls[0].url).toBe("/api/v1/admin/reports/tickets?period=week&page=2");
    expect(calls[2].url).toBe("/api/v1/admin/users?search=ana&page=1");
    expect(typeof http.post).toBe("function");
    expect(typeof http.delete).toBe("function");
  });

  it("filenameFromDisposition usa un respaldo seguro", () => {
    expect(filenameFromDisposition(null)).toBe("descarga");
    expect(filenameFromDisposition('attachment; filename="..\\\\..\\\\x.csv"')).toBe("x.csv");
    expect(filenameFromDisposition("attachment; filename*=UTF-8''reporte%20mes.csv")).toBe("reporte mes.csv");
    expect(filenameFromDisposition('attachment; filename=""')).toBe("descarga");
  });
});

describe("CA-19 administration-sections", () => {
  const ok = () =>
    json(200, {
      data: {
        period: { type: "week", from: "a", to: "b", label: "S", previous_date: null, next_date: null },
        totals: { tickets: 0, adults: 0, children: 0, revenue: "0.00" },
        daily: [],
        tickets: [],
        today: {},
      },
      meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
    });

  async function callAll(api: ReturnType<typeof createAdminApi>, query = { period: "week" as const }) {
    await api.dashboard.summary();
    await api.reports.tickets(query);
    await api.reports.exportTickets(query, "csv").catch(() => undefined);
  }

  it("envía timezone con la zona del dispositivo en panel, reporte y exportación", async () => {
    const { http, calls } = clientWith(ok);

    await callAll(createAdminApi(http, { deviceTimeZone: () => "America/Tijuana" }));

    expect(calls).toHaveLength(3);
    for (const call of calls) {
      expect(new URL(call.url, "http://x").searchParams.get("timezone")).toBe("America/Tijuana");
    }
  });

  it("no envía timezone si el navegador no informa la zona", async () => {
    const { http, calls } = clientWith(ok);

    await callAll(createAdminApi(http, { deviceTimeZone: () => undefined }));

    for (const call of calls) expect(call.url).not.toContain("timezone");
  });

  it("un timezone explícito prevalece y el predeterminado usa la zona de Intl", async () => {
    const explicit = clientWith(ok);
    await createAdminApi(explicit.http, { deviceTimeZone: () => "America/Tijuana" }).reports.tickets({
      period: "week",
      timezone: "Europe/Madrid",
    });
    expect(explicit.calls[0].url).toContain("timezone=Europe%2FMadrid");

    const fallback = clientWith(ok);
    await createAdminApi(fallback.http).dashboard.summary();
    const expected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(new URL(fallback.calls[0].url, "http://x").searchParams.get("timezone")).toBe(expected);
  });
});

describe("CA-19 administration-sections · exportación con la zona del reporte", () => {
  it("reporte y exportación usan la misma zona aunque la del sistema cambie entre ambas", async () => {
    const responses = () =>
      json(200, {
        data: {
          period: { type: "week", from: "a", to: "b", label: "S", previous_date: null, next_date: null, timezone: "America/Tijuana" },
          totals: { tickets: 0, adults: 0, children: 0, revenue: "0.00" },
          daily: [],
          tickets: [],
        },
        meta: { current_page: 1, last_page: 1, per_page: 50, total: 0 },
      });
    const { http, calls } = clientWith(responses);
    let system = "America/Mexico_City";
    const api = createAdminApi(http, { deviceTimeZone: () => system });

    const report = await api.reports.tickets({ period: "week" });
    system = "Asia/Tokyo";
    await api.reports.exportTickets(
      { period: "week", timezone: report.period.timezone },
      "csv",
    );

    const zones = calls.map((call) => new URL(call.url, "http://x").searchParams.get("timezone"));
    expect(zones).toEqual(["America/Mexico_City", "America/Tijuana"]);
  });
});
