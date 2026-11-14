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
const photo = () => new File(["x"], "foto.png", { type: "image/png" });

it("CA-02 species-api-client: list envía status solo si hay filtro y page", async () => {
  const { api, calls } = clientWith(() => json(200, { data: [], meta: { has_more: true } }));

  const all = await api.speciesPublicationRequests.list({ page: 1 });
  await api.speciesPublicationRequests.list({ status: "submitted", page: 2 });

  expect(calls[0].url).toBe(`${base}/species-publication-requests?page=1`);
  expect(calls[1].url).toBe(`${base}/species-publication-requests?status=submitted&page=2`);
  expect(calls[0].init?.method).toBe("GET");
  expect(all.meta.has_more).toBe(true);
});

it("CA-05 species-api-client: get usa la ruta del detalle", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 7, species_id: 3 }));

  const detail = await api.speciesPublicationRequests.get(7);

  expect(calls[0].url).toBe(`${base}/species-publication-requests/7`);
  expect(detail.species_id).toBe(3);
});

it("CA-06 species-api-client: image devuelve blob por ruta autenticada, sin image_url", async () => {
  const { api, calls } = clientWith(
    () => new Response("binario", { status: 200, headers: { "Content-Type": "image/png" } }),
  );

  const pending = await api.speciesPublicationRequests.image(7);
  await api.publishedSpecies.image(3);

  expect(calls[0].url).toBe(`${base}/species-publication-requests/7/image`);
  expect(calls[1].url).toBe(`${base}/species/3/image`);
  expect(calls[0].init?.credentials).toBe("include");
  expect(await pending.blob.text()).toBe("binario");
  expect(JSON.stringify(calls)).not.toContain("image_url");
  expect(JSON.stringify(calls)).not.toContain("/media");
});

it("CA-07 species-api-client: update sin archivo es PATCH JSON; con archivo es POST con _method=PATCH y published_fields como cadena JSON", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 7 }));

  await api.speciesPublicationRequests.update(7, {
    habitat: "Sabana",
    category: "mammal",
    published_fields: ["scientific_name", "habitat"],
  });
  await api.speciesPublicationRequests.update(7, {
    origin: "",
    published_fields: ["origin"],
    image: photo(),
  });

  expect(calls[0].url).toBe(`${base}/species-publication-requests/7`);
  expect(calls[0].init?.method).toBe("PATCH");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({
    habitat: "Sabana",
    category: "mammal",
    published_fields: '["scientific_name","habitat"]',
  });

  expect(calls[1].init?.method).toBe("POST");
  const form = calls[1].init?.body as FormData;

  expect(form).toBeInstanceOf(FormData);
  expect(form.get("_method")).toBe("PATCH");
  expect(form.get("published_fields")).toBe('["origin"]');
  expect(form.get("origin")).toBe("");
  expect(form.get("image")).toBeInstanceOf(File);
});

it("CA-11 species-api-client: accept envía {publish: true} o {publish: false}", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 3 }));

  await api.speciesPublicationRequests.accept(7, { publish: true });
  await api.speciesPublicationRequests.accept(7, { publish: false });

  expect(calls[0].url).toBe(`${base}/species-publication-requests/7/accept`);
  expect(calls[0].init?.method).toBe("POST");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({ publish: true });
  expect(JSON.parse(String(calls[1].init?.body))).toEqual({ publish: false });
});

it("CA-13 species-api-client: reject envía {rejection_reason}", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 7, status: "rejected" }));

  await api.speciesPublicationRequests.reject(7, { rejection_reason: "Foto borrosa" });

  expect(calls[0].url).toBe(`${base}/species-publication-requests/7/reject`);
  expect(calls[0].init?.method).toBe("POST");
  expect(JSON.parse(String(calls[0].init?.body))).toEqual({ rejection_reason: "Foto borrosa" });
});

it("CA-51 species-api-client: list envía status y category solo si hay filtro", async () => {
  const { api, calls } = clientWith(() => json(200, { data: [], meta: { has_more: false } }));

  await api.publishedSpecies.list({ page: 1 });
  await api.publishedSpecies.list({ status: "unpublished", category: "bird", page: 3 });

  expect(calls[0].url).toBe(`${base}/published-species?page=1`);
  expect(calls[1].url).toBe(`${base}/published-species?status=unpublished&category=bird&page=3`);
});

it("CA-53 species-api-client: unpublish es POST sin cuerpo", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 3 }));

  await api.publishedSpecies.unpublish(3);

  expect(calls[0].url).toBe(`${base}/species/3/unpublish`);
  expect(calls[0].init?.method).toBe("POST");
  expect(calls[0].init?.body).toBeUndefined();
});

it("CA-54 species-api-client: republish es POST sin cuerpo", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 3 }));

  await api.publishedSpecies.republish(3);

  expect(calls[0].url).toBe(`${base}/species/3/republish`);
  expect(calls[0].init?.method).toBe("POST");
  expect(calls[0].init?.body).toBeUndefined();
});

it("CA-55 species-api-client: update de la ficha es PATCH sin archivo y POST con _method con archivo", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 3 }));

  await api.publishedSpecies.update(3, { habitat: "Selva", category: "bird" });
  await api.publishedSpecies.update(3, { category: "bird", image: photo() });
  await api.publishedSpecies.get(3);

  expect(calls[0].url).toBe(`${base}/species/3/publication`);
  expect(calls[0].init?.method).toBe("PATCH");
  expect(calls[1].init?.method).toBe("POST");
  expect((calls[1].init?.body as FormData).get("_method")).toBe("PATCH");
  expect(calls[2].init?.method).toBe("GET");
});

it("CA-56 species-api-client: removePublication es DELETE /species/{id}/publication", async () => {
  const { api, calls } = clientWith(() => json(200, { id: 3 }));

  await api.publishedSpecies.removePublication(3);

  expect(calls[0].url).toBe(`${base}/species/3/publication`);
  expect(calls[0].init?.method).toBe("DELETE");
});
