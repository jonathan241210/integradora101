import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAdminApi, createHttpClient, createTicketSalesApi } from "@arca/api-client";

let originalDocument: PropertyDescriptor | undefined;

// El cliente HTTP lee la cookie XSRF del documento antes de cada POST.
beforeEach(() => {
  originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: "XSRF-TOKEN=token%2Bcsrf" },
  });
});

afterEach(() => {
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

type Call = { url: string; init?: RequestInit };

function clientWith(respond: (call: Call) => Response) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const call = { url: String(input), init };
    calls.push(call);

    return call.url === "/sanctum/csrf-cookie" ? new Response(null, { status: 204 }) : respond(call);
  };

  return { calls, http: createHttpClient({ baseUrl: "", fetchImpl }) };
}

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

describe("CA-05 ticket-cancellation-report", () => {
  it("test_ca05_report_sends_filters_and_never_timezone", async () => {
    const { http, calls } = clientWith(() => json({ data: { rows: [] } }));

    await createAdminApi(http).reports.cancellations({
      period: "custom",
      from: "2026-11-01",
      to: "2026-11-15",
      cashier_id: 4,
      reason_code: "other",
      timezone: "Europe/Madrid",
    } as never);

    expect(calls[0].url).toBe(
      "/api/v1/admin/reports/cancellations?period=custom&from=2026-11-01&to=2026-11-15&cashier_id=4&reason_code=other",
    );
    expect(calls[0].url).not.toContain("timezone");
  });
});

describe("CA-05 ticket-cancellation-report (period obligatorio)", () => {
  it("test_ca05_default_week_without_date_still_sends_period", async () => {
    const { http, calls } = clientWith(() => json({ data: { rows: [] } }));
    const api = createAdminApi(http);

    await api.reports.cancellations({ period: "week" });
    await api.reports.exportCancellations({ period: "week" }, "csv");

    expect(calls[0].url).toBe("/api/v1/admin/reports/cancellations?period=week");
    expect(calls[1].url).toBe("/api/v1/admin/reports/cancellations/export?period=week&format=csv");
  });
});

describe("CA-06 ticket-cancellation-report", () => {
  it("test_ca06_cashiers_endpoint_returns_id_and_name", async () => {
    const { http, calls } = clientWith(() => json({ data: [{ id: 4, name: "Caja Uno" }] }));

    const cashiers = await createAdminApi(http).reports.cancellationCashiers();

    expect(calls[0].url).toBe("/api/v1/admin/reports/cancellations/cashiers");
    expect(cashiers).toEqual([{ id: 4, name: "Caja Uno" }]);
  });
});

describe("CA-16 ticket-cancellation-report", () => {
  it("test_ca16_export_sends_same_filters_and_format_without_timezone", async () => {
    const { http, calls } = clientWith(
      () => new Response("x", { status: 200, headers: { "Content-Disposition": 'attachment; filename="cancelaciones.pdf"' } }),
    );

    const file = await createAdminApi(http).reports.exportCancellations(
      { period: "week", date: "2026-11-17", reason_code: "capture_error" },
      "pdf",
    );

    expect(calls[0].url).toBe(
      "/api/v1/admin/reports/cancellations/export?period=week&date=2026-11-17&reason_code=capture_error&format=pdf",
    );
    expect(file.filename).toBe("cancelaciones.pdf");
  });
});

describe("CA-18 ticket-cancellation-report", () => {
  it("test_ca18_catalog_comes_from_get_cancellation_reasons", async () => {
    const reasons = [{ code: "other", label: "Otro", comment_policy: "required" }];
    const { http, calls } = clientWith(() => json({ data: reasons }));

    expect(await createTicketSalesApi(http).tickets.cancellationReasons()).toEqual(reasons);
    expect(calls[0].url).toBe("/api/v1/admin/tickets/cancellation-reasons");
  });
});

describe("CA-21 ticket-cancellation-report", () => {
  it("test_ca21_cancel_body_carries_reason_code_and_comment", async () => {
    const { http, calls } = clientWith(() => json({ data: { folio: 7 } }));

    await createTicketSalesApi(http).history.cancel(7, { reason_code: "other", reason: "Cobro repetido por error" });

    expect(calls.at(-1)?.url).toBe("/api/v1/admin/tickets/7/cancel");
    expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({
      reason_code: "other",
      reason: "Cobro repetido por error",
    });
  });
});
