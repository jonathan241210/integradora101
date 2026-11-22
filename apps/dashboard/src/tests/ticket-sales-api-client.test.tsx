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

  return { calls, api: createTicketSalesApi(http) };
}

const page = { data: [], links: {}, meta: { current_page: 1, last_page: 1, per_page: 25, total: 0 } };

describe("dashboard-019 single-business-timezone (cliente)", () => {
  it("CA-04 single-business-timezone: history.list no envía timezone aunque el llamador lo pase", async () => {
    const { api, calls } = clientWith(() => json(200, page));

    await api.history.list({ folio: "7", status: "completed", page: 2, timezone: "UTC" } as never);
    await api.history.list({});

    for (const call of calls) expect(call.url).not.toContain("timezone");
    const listUrl = new URL(calls[0].url, "http://x");
    expect(listUrl.pathname).toBe("/api/v1/admin/tickets");
    expect(listUrl.searchParams.get("folio")).toBe("7");
    expect(listUrl.searchParams.get("status")).toBe("completed");
    expect(listUrl.searchParams.get("page")).toBe("2");
  });

  it("CA-07 single-business-timezone: historial envía from y to como Y-m-d sin timezone", async () => {
    const { api, calls } = clientWith(() => json(200, page));

    await api.history.list({ from: "2026-11-06", to: "2026-11-06" });

    const params = new URL(calls[0].url, "http://x").searchParams;
    expect(params.get("from")).toBe("2026-11-06");
    expect(params.get("to")).toBe("2026-11-06");
    expect(params.has("timezone")).toBe(false);
  });

  it("CA-08 single-business-timezone: cancelar envía reason_code y reason, sin timezone", async () => {
    const { api, calls } = clientWith(() => json(200, { data: { folio: 7 } }));

    await api.history.cancel(7, { reason_code: "capture_error", reason: "Error de captura" });

    expect(calls[0].url).toBe("/api/v1/admin/tickets/7/cancel");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ reason_code: "capture_error", reason: "Error de captura" });
    expect(String(calls[0].init?.body)).not.toContain("timezone");
  });

  it("CA-01 single-business-timezone: history.list conserva la zona de negocio que informa la API", async () => {
    const { api } = clientWith(() => json(200, { ...page, timezone: "America/Mexico_City" }));

    expect((await api.history.list({})).timezone).toBe("America/Mexico_City");
  });
});

describe("CA-05 ticket-sales (cliente)", () => {
  it("sales.quote envía solo las cantidades, sin zona horaria, y desenvuelve data", async () => {
    const { api, calls } = clientWith(() =>
      json(200, { data: { adult_unit_price: "25.00", child_unit_price: "16.00", adult_subtotal: "50.00", child_subtotal: "16.00", total_amount: "66.00" } }),
    );

    const quote = await api.sales.quote({ adult_quantity: 2, child_quantity: 1 });

    expect(quote.total_amount).toBe("66.00");
    expect(calls[0].url).toBe("/api/v1/admin/tickets/quote");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      adult_quantity: 2,
      child_quantity: 1,
    });
  });

  it("sales.quote acepta la respuesta sin envoltura", async () => {
    const { api } = clientWith(() => json(200, { total_amount: "10.00" }));

    expect((await api.sales.quote({ adult_quantity: 1, child_quantity: 0 })).total_amount).toBe("10.00");
  });
});

describe("CA-21 ticket-sales", () => {
  it("sales.create no envía zona ni montos y devuelve la compra con sus boletos desenvuelta de data", async () => {
    const { api, calls } = clientWith(() =>
      json(201, {
        data: {
          adult_quantity: 1,
          child_quantity: 3,
          total_amount: "73.00",
          tickets: [
            { folio: 101, ticket_type: "adult", unit_price: "25.00", total_amount: "25.00", qr_svg: "<svg/>" },
            { folio: 102, ticket_type: "child", unit_price: "16.00", total_amount: "16.00", qr_svg: "<svg/>" },
          ],
        },
      }),
    );

    const sale = await api.sales.create({ adult_quantity: 1, child_quantity: 3 });

    expect(sale.total_amount).toBe("73.00");
    expect(sale.tickets).toHaveLength(2);
    expect(sale.tickets[1].ticket_type).toBe("child");
    expect(calls[0].url).toBe("/api/v1/admin/tickets");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      adult_quantity: 1,
      child_quantity: 3,
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
