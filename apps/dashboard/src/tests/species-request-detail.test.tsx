import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import {
  closeRequestDetail,
  openRequest,
  requestActions,
} from "../viewmodels/species-requests";
import { apiError, fakeApi, harness, requestDetail, stateWith, viewModelFor } from "./species-fixtures";

const detailState = (
  detail: ReturnType<typeof requestDetail>,
  patch: Parameters<typeof stateWith>[0] = {},
) =>
  stateWith({
    selectedId: detail.id,
    detail: { status: "ready", data: detail, error: "", forbidden: false },
    pendingPhoto: { status: "ready", url: "blob:test/pendiente" },
    publishedPhoto: { status: "ready", url: "blob:test/publicada" },
    ...patch,
  });
const render = (state: ReturnType<typeof stateWith>) =>
  renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(state)} />);

it("CA-05 species-request-detail: muestra actual y propuesto; sin URL de foto en el DTO", async () => {
  const detail = requestDetail(
    { request_type: "update" },
    { publication_status: "published", is_published: true, has_image: true, scientific_name: "Leo viejo" },
    { has_new_photo: false },
  );
  const { api, requests } = fakeApi();
  requests.get.mockResolvedValueOnce(detail);
  const h = harness(api);

  await openRequest(h.ctx, 7);

  expect(requests.get).toHaveBeenCalledWith(7);
  expect(JSON.stringify(h.state.detail.data)).not.toMatch(/image_url|\/media/);

  const html = render(h.state);

  expect(html).toContain("Datos actuales");
  expect(html).toContain("Datos propuestos");
  expect(html).toContain("Leo viejo");
  expect(html).toContain("Sabana abierta");
  expect(html).toContain("Área de distribución natural");
  expect(html).toContain("África subsahariana");
  expect(html).toContain("(no editable)");
  expect(html).toContain("Actualización");
  expect(html).toContain("Ana Pérez");
  expect(html).toContain("Pendiente");
  expect(html).toContain("Sin foto nueva: se mantiene la foto publicada.");
  expect(html).toContain("Nombre científico");
});

it("CA-06 species-request-detail: foto como blob con alt; revocación al cerrar o cambiar; 404 muestra «No se pudo cargar la foto.»", async () => {
  const detail = requestDetail({}, { has_image: true, publication_status: "published", is_published: true });
  const { api, requests, species } = fakeApi();
  requests.get.mockResolvedValue(detail);
  const h = harness(api);

  await openRequest(h.ctx, 7);

  expect(requests.image).toHaveBeenCalledWith(7);
  expect(species.image).toHaveBeenCalledWith(3);
  expect(h.state.pendingPhoto.status).toBe("ready");
  expect(h.state.pendingPhoto.url).toMatch(/^blob:/);

  const html = render(h.state);

  expect(html).toContain('alt="Foto de León africano"');
  expect(html).toContain('alt="Foto publicada de León africano"');

  const urls = [h.state.pendingPhoto.url, h.state.publishedPhoto.url];

  // Cambiar de solicitud revoca las URL anteriores.
  await openRequest(h.ctx, 8);
  expect(h.revoked).toEqual(expect.arrayContaining(urls));

  const open = [h.state.pendingPhoto.url, h.state.publishedPhoto.url];

  closeRequestDetail(h.ctx);
  expect(h.revoked).toEqual(expect.arrayContaining(open));
  expect(h.state.selectedId).toBeNull();

  requests.image.mockRejectedValueOnce(apiError(404, "No encontrada."));
  const missing = harness(api);

  await openRequest(missing.ctx, 7);

  expect(missing.state.pendingPhoto.status).toBe("error");
  expect(render(missing.state)).toContain("No se pudo cargar la foto.");
});

it("CA-44 species-request-detail: la sección no usa image_url ni construye rutas de /media", () => {
  const files = [
    "views/SpeciesRequestsView.tsx",
    "views/SpeciesRequestDetailView.tsx",
    "components/SpeciesPhoto.tsx",
    "components/SpeciesFichaForm.tsx",
    "components/RejectSpeciesRequestDialog.tsx",
    "components/SpeciesStatusBadge.tsx",
    "sections/SpeciesRequestsSection.tsx",
    "viewmodels/species-requests.ts",
    "viewmodels/useSpeciesRequests.ts",
    "viewmodels/species-publication-shared.ts",
  ];

  for (const file of files) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

    expect(source, file).not.toMatch(/image_url|\/media/);
  }
});

it("CA-61 species-request-detail: datos de la solicitud sobre especie despublicada", () => {
  const detail = requestDetail(
    { request_type: "update" },
    {
      publication_status: "unpublished",
      published_at: "2026-10-01T00:00:00Z",
      scientific_name: "Última guardada",
      has_image: true,
    },
  );
  const html = render(detailState(detail));

  expect(html).toContain("Especie despublicada");
  expect(html).toContain("Última guardada");
  expect(html).toContain("Sabana abierta");
  expect(html).toContain(
    "La especie no aparece en el catálogo hasta que la aceptes con «Aceptar y publicar».",
  );
});

it("CA-15 species-request-detail: acciones por estado", () => {
  const pending = render(detailState(requestDetail()));

  expect(pending).toContain(">Editar<");
  expect(pending).toContain(">Aceptar y publicar<");
  expect(pending).toContain(">Rechazar<");
  expect(pending).not.toContain("Aceptar sin publicar");

  const unpublished = render(
    detailState(requestDetail({}, { publication_status: "unpublished" })),
  );

  expect(unpublished).toContain(">Aceptar sin publicar<");

  const accepted = render(detailState(requestDetail({ status: "accepted" })));

  expect(accepted).toContain("Publicada en el catálogo");
  expect(accepted).not.toMatch(/>(Editar|Aceptar y publicar|Rechazar)</);

  const rejected = render(
    detailState(requestDetail({ status: "rejected", rejection_reason: "Foto borrosa" })),
  );

  expect(rejected).toContain("Foto borrosa");
  expect(rejected).toContain("Rechazada");
  expect(rejected).not.toMatch(/>(Editar|Aceptar y publicar|Rechazar)</);
  expect(rejected).toContain("Volver a la lista");
  expect(requestActions(requestDetail({ status: "accepted" }), false).canEdit).toBe(false);
});
