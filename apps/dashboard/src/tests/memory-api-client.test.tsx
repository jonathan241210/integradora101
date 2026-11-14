import { afterEach, beforeEach, expect, it } from "vitest";
import { createAdminApi, createHttpClient } from "@arca/api-client";

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
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

type Call = { url: string; init?: RequestInit };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function clientWith(respond: (call: Call) => Response) {
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

  return { calls, api: createAdminApi(createHttpClient({ baseUrl: "", fetchImpl })) };
}

const base = "/api/v1/admin";

it("CA-02 memory-api-client: list envía status solo con filtro y page; no envía limit", async () => {
  const { api, calls } = clientWith(() =>
    json(200, { data: [], meta: { page: 1, limit: 10, has_more: true } }),
  );

  const all = await api.memoryReview.list({ page: 1 });
  await api.memoryReview.list({ status: "in_review", page: 2 });

  expect(calls[0].url).toBe(`${base}/memories?page=1`);
  expect(calls[1].url).toBe(`${base}/memories?status=in_review&page=2`);
  expect(calls[0].init?.method).toBe("GET");
  expect(JSON.stringify(calls)).not.toContain("limit");
  expect(all.meta.has_more).toBe(true);
});

it("CA-05 memory-api-client: get usa la ruta del detalle", async () => {
  const { api, calls } = clientWith(() => json(200, { data: { id: 11, status: "in_review" } }));

  const detail = await api.memoryReview.get(11);

  expect(calls[0].url).toBe(`${base}/memories/11`);
  expect(detail.status).toBe("in_review");
});

it("CA-08 memory-api-client: accept es POST sin cuerpo", async () => {
  const { api, calls } = clientWith(() => json(200, { data: { published_until: "2026-11-20" } }));

  await expect(api.memoryReview.accept(11)).resolves.toBeUndefined();

  expect(calls[0].url).toBe(`${base}/memories/11/accept`);
  expect(calls[0].init?.method).toBe("POST");
  expect(calls[0].init?.body).toBeUndefined();
});

it("CA-17 memory-api-client: image pide la ruta relativa del mismo origen, devuelve blob y no hay URL absoluta", async () => {
  const { api, calls } = clientWith(
    () => new Response("binario", { status: 200, headers: { "Content-Type": "image/png" } }),
  );

  const file = await api.memoryReview.image(11);

  expect(calls[0].url).toBe(`${base}/memories/11/image`);
  expect(calls[0].url).not.toMatch(/^https?:/);
  expect(calls[0].init?.credentials).toBe("include");
  expect(await file.blob.text()).toBe("binario");
  expect(JSON.stringify(calls)).not.toContain("image_url");
});

it("RN-09 memory-api-client: la imagen usa /api/v1/admin/memories/{id}/image sin CORS", async () => {
  const { api, calls } = clientWith(
    () => new Response("x", { status: 200, headers: { "Content-Type": "image/jpeg" } }),
  );

  await api.memoryReview.image(42);

  expect(calls[0].url).toBe("/api/v1/admin/memories/42/image");
  expect(calls[0].init?.mode).toBeUndefined();
});

it("RN-05 memory-api-client: reject envía rejection_reason y rejected_fields como array", async () => {
  const { api, calls } = clientWith(() => json(200, { data: {} }));

  await api.memoryReview.reject(11, {
    rejection_reason: "Foto borrosa",
    rejected_fields: ["image", "content"],
  });

  expect(calls[0].url).toBe(`${base}/memories/11/reject`);
  expect(calls[0].init?.method).toBe("POST");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    rejection_reason: "Foto borrosa",
    rejected_fields: ["image", "content"],
  });
});
