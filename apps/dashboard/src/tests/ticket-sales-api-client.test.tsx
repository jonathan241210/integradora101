import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHttpClient, createTicketSalesApi } from "@arca/api-client";

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

type Call = { url: string; init?: RequestInit };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(
  respond: (call: Call) => Response,
  deviceTimeZone: () => string | undefined = () => "America/Mexico_City",
  onUnauthorized?: () => void,
) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const call = { url: String(input), init };

    if (call.url === "/sanctum/csrf-cookie") {
      documentCookie = "XSRF-TOKEN=token";
      return new Response(null, { status: 204 });
    }

    calls.push(call);
    return respond(call);
  };
  const http = createHttpClient({ baseUrl: "", fetchImpl, onUnauthorized });

  return { calls, api: createTicketSalesApi(http, { deviceTimeZone }) };
}

const page = { data: [], links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } };

describe("CA-13 ticket-sales", () => {
  it("history.list envía timezone del dispositivo y filtros", async () => {
    const { api, calls } = clientWith((call) =>
      call.url.endsWith("/cancel") ? json(200, { data: { folio: 7 } }) : json(200, page),
    );

    await api.history.list({ folio: "7", status: "completed", page: 2 });
    await api.history.cancel(7, { reason: "Error" });

    const listUrl = new URL(calls[0].url, "http://x");

    expect(listUrl.pathname).toBe("/api/v1/admin/tickets");
    expect(listUrl.searchParams.get("timezone")).toBe("America/Mexico_City");
    expect(listUrl.searchParams.get("folio")).toBe("7");
    expect(listUrl.searchParams.get("status")).toBe("completed");
    expect(listUrl.searchParams.get("page")).toBe("2");
    expect(calls[1].url).toBe("/api/v1/admin/tickets/7/cancel");
    expect(JSON.parse(String(calls[1].init?.body))).toEqual({ reason: "Error" });
  });

  it("el llamador puede sobrescribir timezone en el historial", async () => {
    const { api, calls } = clientWith((call) =>
      call.url.endsWith("/cancel") ? json(200, { data: {} }) : json(200, page),
    );

    await api.history.list({ timezone: "UTC" });

    expect(new URL(calls[0].url, "http://x").searchParams.get("timezone")).toBe("UTC");
  });
});

describe("CA-12 ticket-sales", () => {
  it("history.cancel envía solo reason, sin timezone, y history.list sí envía la zona", async () => {
    const { api, calls } = clientWith((call) =>
      call.url.endsWith("/cancel") ? json(200, { data: { folio: 7 } }) : json(200, page),
    );

    await api.history.cancel(7, { reason: "Error de captura" });
    await api.history.list({});

    expect(calls[0].url).toBe("/api/v1/admin/tickets/7/cancel");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ reason: "Error de captura" });
    expect(String(calls[0].init?.body)).not.toContain("timezone");
    expect(calls[0].url).not.toContain("timezone");
    expect(new URL(calls[1].url, "http://x").searchParams.get("timezone")).toBe("America/Mexico_City");
  });
});

describe("CA-21 ticket-sales", () => {
  it("sales.create no envía zona ni montos y desenvuelve data", async () => {
    const { api, calls } = clientWith(() =>
      json(201, { data: { folio: 5, total_amount: "66.00", qr_svg: "<svg/>" } }),
    );

    const ticket = await api.sales.create({ adult_quantity: 2, child_quantity: 1 });

    expect(ticket.total_amount).toBe("66.00");
    expect(calls[0].url).toBe("/api/v1/admin/tickets");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      adult_quantity: 2,
      child_quantity: 1,
    });
  });

  it("precios: current y schedule usan las rutas de api-009", async () => {
    const { api, calls } = clientWith((call) =>
      call.url.endsWith("/current")
        ? json(200, { data: { adult: { amount: "25.00" }, child: { amount: null } } })
        : json(201, { data: { prices: [], current: {} } }),
    );

    const current = await api.prices.current();
    await api.prices.schedule({
      adult_amount: "30",
      child_amount: "20",
      mode: "scheduled",
      effective_at: "2026-12-01T09:00:00-06:00",
    });

    expect(current.adult.amount).toBe("25.00");
    expect(calls[0].url).toBe("/api/v1/admin/ticket-prices/current");
    expect(calls[1].url).toBe("/api/v1/admin/ticket-prices");
    expect(JSON.parse(String(calls[1].init?.body)).effective_at).toBe("2026-12-01T09:00:00-06:00");
  });

  it("normaliza el historial a { data, meta } y propaga el 401 y el code del 403", async () => {
    let unauthorized = 0;
    const { api } = clientWith(
      (call) =>
        call.url.includes("ticket-prices")
          ? json(403, { message: "Configura 2FA.", code: "two_factor_setup_required" })
          : json(401, { message: "Unauthenticated." }),
      () => undefined,
      () => {
        unauthorized += 1;
      },
    );

    await expect(api.history.list()).rejects.toMatchObject({ status: 401 });
    expect(unauthorized).toBe(1);
    await expect(api.prices.current()).rejects.toMatchObject({
      status: 403,
      code: "two_factor_setup_required",
    });

    const empty = clientWith(() => json(200, page));
    const result = await empty.api.history.list();

    expect(result).toEqual({ data: [], meta: page.meta });
  });
});
