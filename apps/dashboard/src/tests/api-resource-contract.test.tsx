import { afterEach, beforeEach, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createAdminApi, createHttpClient } from "@arca/api-client";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import { loadDetail, loadList as loadMemoryList } from "../viewmodels/memory-review";
import { openPublished, publishedActions } from "../viewmodels/published-species";
import { loadRequestList, openRequest, requestActions } from "../viewmodels/species-requests";
import { harness as requestsHarness, requestDetail, summary as requestSummary, viewModelFor } from "./species-fixtures";
import { publication, publishedHarness, publishedViewModel, row } from "./species-published-fixtures";
import { detail as memoryDetail, detailHarness, listHarness, summary as memorySummary } from "./memory-fixtures";

/*
 * Contrato con los Resources de apps/api (solo lectura; escritos a mano a partir de
 * `Http/Resources/Admin/*Resource.php`). Cada cuerpo JSON de abajo tiene la forma EXACTA
 * que serializa la API: sin `image_url`, fechas ISO, `data` solo donde Laravel lo añade
 * (JsonResource devuelto directamente) y sin envoltura donde el controlador usa `resolve()`.
 */

let originalDocument: PropertyDescriptor | undefined;
let cookie = "";

beforeEach(() => {
  originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  cookie = "";
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return cookie;
      },
      set cookie(value: string) {
        cookie = value;
      },
    },
  });
});

afterEach(() => {
  if (originalDocument) Object.defineProperty(globalThis, "document", originalDocument);
  else Reflect.deleteProperty(globalThis, "document");
});

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

/** Cliente real de `@arca/api-client` sobre un `fetch` que responde por ruta. */
function realApi(routes: Record<string, unknown>) {
  const fetchImpl: typeof fetch = async (input) => {
    const url = String(input);

    if (url === "/sanctum/csrf-cookie") {
      cookie = "XSRF-TOKEN=token";

      return new Response(null, { status: 204 });
    }

    if (url.endsWith("/image")) {
      return new Response("binario", { status: 200, headers: { "Content-Type": "image/png" } });
    }

    const path = url.split("?")[0];

    if (!(path in routes)) throw new Error(`Ruta sin simular: ${url}`);

    return json(routes[path]);
  };

  return createAdminApi(createHttpClient({ baseUrl: "", fetchImpl }));
}

const base = "/api/v1/admin";
const sorted = (value: object) => Object.keys(value).sort();

/* ----- Cuerpos tal como los serializan los Resources de la API ----- */

// SpeciesPublicationRequestResource: solicitud `submitted` sobre especie despublicada (api-014).
const apiRequestRow = {
  id: 7,
  species_id: 3,
  common_name: "León africano",
  scientific_name: "Panthera leo",
  category: "mammal",
  request_type: "update",
  status: "submitted",
  publication_status: "unpublished",
  created_at: "2026-11-10T15:30:00.000000Z",
  veterinarian_name: "Ana Pérez",
};

// SpeciesPublicationRequestDetailResource (sin `data`).
const apiRequestDetail = {
  id: 7,
  species_id: 3,
  status: "submitted",
  request_type: "update",
  created_at: "2026-11-10T15:30:00.000000Z",
  veterinarian_name: "Ana Pérez",
  rejection_reason: null,
  published_fields: ["scientific_name", "origin", "habitat"],
  current: {
    common_name: "León africano",
    scientific_name: "Panthera leo",
    habitat: "Sabana",
    origin: "África",
    category: "mammal",
    is_published: false,
    published_at: "2026-10-01T12:00:00.000000Z",
    publication_status: "unpublished",
    has_image: true,
  },
  proposed: {
    scientific_name: "Panthera leo",
    habitat: "Sabana abierta",
    origin: "África",
    category: "mammal",
    published_fields: ["scientific_name", "origin", "habitat"],
    has_new_photo: false,
  },
};

// SpeciesPublicationDetailResource (sin `data`); `published_fields` puede ser null.
const apiPublicationDetail = {
  id: 3,
  common_name: "León africano",
  scientific_name: "Panthera leo",
  habitat: "Sabana",
  origin: "África",
  category: "mammal",
  publication_status: "unpublished",
  is_published: false,
  published_at: "2026-10-01T12:00:00.000000Z",
  unpublished_at: "2026-11-01T12:00:00.000000Z",
  published_fields: null,
  has_image: true,
  has_pending_request: false,
};

// PublishedSpeciesResource (admin).
const apiPublishedRow = {
  id: 3,
  common_name: "León africano",
  scientific_name: "Panthera leo",
  category: "mammal",
  status: "unpublished",
  published_at: "2026-10-01T12:00:00.000000Z",
  unpublished_at: "2026-11-01T12:00:00.000000Z",
  has_image: true,
  has_pending_request: true,
};

// MemoryReviewResource y MemoryReviewDetailResource (el detalle sí lleva `data`).
const apiMemoryRow = {
  id: 11,
  status: "submitted",
  opinion: "Mi primer viaje al zoológico fue inolvidable.",
  created_at: "2026-11-10T15:30:00+00:00",
  resubmitted_count: 0,
};
const apiMemoryDetail = {
  id: 11,
  status: "rejected",
  opinion: "Mi primer viaje al zoológico fue inolvidable.",
  created_at: "2026-11-10T15:30:00+00:00",
  resubmitted_count: 1,
  rejection_reason: "La foto no corresponde.",
  rejected_fields: ["image"],
  reviewed_at: "2026-11-11T09:00:00+00:00",
  published_at: null,
  published_until: null,
  is_published: false,
  publication_days: 7,
};

it("CA-02 CA-03 api-resource-contract: lista de solicitudes con la forma exacta del Resource y especie despublicada", async () => {
  const api = realApi({
    [`${base}/species-publication-requests`]: { data: [apiRequestRow], meta: { has_more: false } },
  });
  const h = requestsHarness(api);

  await loadRequestList(h.ctx, { filter: "", page: 1 });

  expect(h.state.list.items).toEqual([apiRequestRow]);
  // El fixture del dashboard no puede tener claves distintas a las del Resource.
  expect(sorted(requestSummary())).toEqual(sorted(apiRequestRow));
  expect(renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(h.state)} />)).toContain("León africano");
});

it("CA-05 CA-62 api-resource-contract: detalle sin envoltura `data`; submitted + unpublished habilita «Aceptar sin publicar»", async () => {
  const api = realApi({ [`${base}/species-publication-requests/7`]: apiRequestDetail });
  const h = requestsHarness(api);

  await openRequest(h.ctx, 7);

  const loaded = h.state.detail.data;

  expect(loaded).toEqual(apiRequestDetail);
  expect(sorted(requestDetail())).toEqual(sorted(apiRequestDetail));
  expect(sorted(requestDetail().current)).toEqual(sorted(apiRequestDetail.current));
  expect(sorted(requestDetail().proposed)).toEqual(sorted(apiRequestDetail.proposed));
  expect(loaded?.current.publication_status).toBe("unpublished");
  expect(requestActions(loaded!, false)).toMatchObject({ canAcceptPublish: true, canAcceptUnpublished: true });
});

it("CA-05 api-resource-contract: la API también puede envolver el detalle en `data` y el cliente lo acepta", async () => {
  const api = realApi({ [`${base}/species-publication-requests/7`]: { data: apiRequestDetail } });

  expect(await api.speciesPublicationRequests.get(7)).toEqual(apiRequestDetail);
});

it("CA-51 CA-52 api-resource-contract: fila de especies publicadas con la forma exacta del Resource", async () => {
  const api = realApi({
    [`${base}/published-species`]: { data: [apiPublishedRow], meta: { has_more: false } },
  });
  const page = await api.publishedSpecies.list({ page: 1 });

  expect(page.data).toEqual([apiPublishedRow]);
  expect(sorted(row())).toEqual(sorted(apiPublishedRow));
});

it("CA-52 CA-55 api-resource-contract: detalle de especie con `published_fields` null no rompe el viewmodel ni la vista", async () => {
  const api = realApi({ [`${base}/species/3/publication`]: apiPublicationDetail });
  const h = publishedHarness(api);

  await openPublished(h.ctx, 3);

  const loaded = h.state.detail.data;

  expect(loaded).toEqual(apiPublicationDetail);
  expect(sorted(publication())).toEqual(sorted(apiPublicationDetail));
  expect(publishedActions(loaded!, false)).toMatchObject({ canEdit: true, canRepublish: true });

  // Edición: el borrador se precarga sin casillas marcadas en lugar de lanzar.
  h.ctx.dispatch({ type: "edit-started" });
  expect(() => renderToStaticMarkup(<PublishedSpeciesDetailView {...publishedViewModel(h.state)} />)).not.toThrow();
  expect(h.state.draft?.published_fields).toEqual([]);
});

it("CA-02 CA-05 api-resource-contract: aceptar devuelve la ficha de la especie sin envoltura y la acción de rechazo el detalle", async () => {
  const api = realApi({
    [`${base}/species-publication-requests/7/accept`]: apiPublicationDetail,
    [`${base}/species-publication-requests/7/reject`]: { ...apiRequestDetail, status: "rejected", rejection_reason: "Motivo" },
  });

  expect(await api.speciesPublicationRequests.accept(7, { publish: false })).toEqual(apiPublicationDetail);
  expect((await api.speciesPublicationRequests.reject(7, { rejection_reason: "Motivo" })).status).toBe("rejected");
});

it("CA-02 CA-04 api-resource-contract: lista de momentos con la forma exacta de MemoryReviewResource", async () => {
  const api = realApi({ [`${base}/memories`]: { data: [apiMemoryRow], meta: { has_more: true } } });
  const h = listHarness(api);

  await loadMemoryList(h.ctx, { filter: "", page: 1 });

  expect(h.state.items).toEqual([apiMemoryRow]);
  expect(h.state.hasMore).toBe(true);
  expect(sorted(memorySummary())).toEqual(sorted(apiMemoryRow));
});

it("CA-05 CA-09 api-resource-contract: detalle de momento envuelto en `data` (JsonResource directo) y sin URL de imagen", async () => {
  const api = realApi({ [`${base}/memories/11`]: { data: apiMemoryDetail } });
  const h = detailHarness(api);

  const loaded = await loadDetail(h.ctx, 11);

  expect(loaded).toEqual(apiMemoryDetail);
  expect(sorted(memoryDetail())).toEqual(sorted(apiMemoryDetail));
  expect(Object.keys(apiMemoryDetail).some((key) => /image_(url|path)|sha256/.test(key))).toBe(false);
});
