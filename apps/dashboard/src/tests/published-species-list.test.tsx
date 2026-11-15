import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import {
  initialPublishedSpeciesState,
  loadPublishedList,
  publishedSpeciesReducer,
  releaseThumbs,
} from "../viewmodels/published-species";
import {
  fakePublishedApi,
  publishedHarness,
  publishedStateWith,
  publishedViewModel,
  publication,
  row,
  unpublishedSpecies,
} from "./species-published-fixtures";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";

const listState = (items: ReturnType<typeof row>[], hasMore = false, page = 1) =>
  publishedStateWith({
    page,
    list: { status: "ready", items, hasMore, error: "", forbidden: false },
    thumbs: Object.fromEntries(
      items.map((item) => [
        item.id,
        item.has_image
          ? { status: "ready" as const, url: `blob:test/${item.id}` }
          : { status: "none" as const, url: "" },
      ]),
    ),
  });
const renderList = (state: ReturnType<typeof listState>, onOpenRequests?: () => void) =>
  renderToStaticMarkup(
    <PublishedSpeciesView {...publishedViewModel(state)} onOpenRequests={onOpenRequests} />,
  );
const renderDetail = (data: ReturnType<typeof publication>) =>
  renderToStaticMarkup(
    <PublishedSpeciesDetailView
      {...publishedViewModel(
        publishedStateWith({
          selectedId: data.id,
          detail: { status: "ready", data, error: "", forbidden: false },
          photo: { status: "ready", url: "blob:test/detalle" },
        }),
      )}
      onOpenRequests={() => undefined}
    />,
  );

it("CA-51 published-species-list: status y category en la query; paginación; «Sin foto»; vacío con «No hay especies con este estado.»", async () => {
  const { api, species } = fakePublishedApi();
  const h = publishedHarness(api);

  species.list.mockResolvedValueOnce({
    data: [row(), row({ id: 4, common_name: "Cebra", has_image: false, status: "unpublished" })],
    meta: { has_more: true },
  });
  await loadPublishedList(h.ctx, { status: "", category: "", page: 1 });
  await loadPublishedList(h.ctx, { status: "unpublished", category: "bird", page: 2 });
  await loadPublishedList(h.ctx, { status: "published", category: "", page: 1 });

  // «Todas» y «Todos los tipos» omiten sus parámetros: la API filtra, no el cliente.
  expect(species.list).toHaveBeenNthCalledWith(1, { status: undefined, category: undefined, page: 1 });
  expect(species.list).toHaveBeenNthCalledWith(2, { status: "unpublished", category: "bird", page: 2 });
  expect(species.list).toHaveBeenNthCalledWith(3, { status: "published", category: undefined, page: 1 });

  // Cambiar un filtro vuelve a la página 1 y limpia filas.
  const changed = publishedSpeciesReducer(listState([row()], false, 3), {
    type: "category-changed",
    category: "fish",
  });

  expect(changed.page).toBe(1);
  expect(changed.list.items).toEqual([]);
  expect(publishedSpeciesReducer(changed, { type: "status-changed", status: "published" }).page).toBe(1);

  // Miniatura solo con has_image (una sola descarga); «Sin foto» en la otra.
  species.list.mockResolvedValueOnce({
    data: [row(), row({ id: 4, common_name: "Cebra", has_image: false })],
    meta: { has_more: true },
  });
  species.image.mockClear();
  const withThumbs = publishedHarness(api);

  await loadPublishedList(withThumbs.ctx, { status: "", category: "", page: 1 });
  expect(species.image).toHaveBeenCalledTimes(1);
  expect(species.image).toHaveBeenCalledWith(3);
  expect(withThumbs.state.thumbs[3]?.status).toBe("ready");
  expect(withThumbs.state.thumbs[4]?.status).toBe("none");

  const html = renderList(withThumbs.state);

  expect(html).toContain("Sin foto");
  expect(html).toMatch(/<img[^>]*src="blob:test\/1"/);
  expect(html).toContain("León africano");
  expect(html).toContain("Mamífero");
  expect(html).toContain("Publicada");
  expect(html).toMatch(/Siguiente<\/button>/);
  expect(html).not.toMatch(/disabled=""[^>]*>Siguiente/);
  expect(renderList(listState([row()], false))).toMatch(/disabled=""[^>]*>Siguiente/);
  expect(html).toContain("Todos los tipos");
  expect(html).toContain("Despublicadas");

  // Miniaturas: se revocan al cambiar de página y al desmontar.
  await loadPublishedList(withThumbs.ctx, { status: "", category: "", page: 2 });
  expect(withThumbs.revoked).toContain("blob:test/1");
  const before = withThumbs.revoked.length;

  releaseThumbs(withThumbs.ctx.preview, withThumbs.state);
  expect(withThumbs.revoked.length).toBeGreaterThan(before);

  // Vacío, cargando y error.
  expect(
    renderList(
      publishedStateWith({ list: { status: "empty", items: [], hasMore: false, error: "", forbidden: false } }),
    ),
  ).toContain("No hay especies con este estado.");
  expect(renderList(initialPublishedSpeciesState)).toContain("Cargando especies…");
});

it("CA-52 published-species-list: acciones por estado", () => {
  const published = renderDetail(publication());

  expect(published).toContain(">Despublicar<");
  expect(published).toContain(">Eliminar publicación<");
  expect(published).not.toContain(">Editar<");
  expect(published).not.toContain(">Republicar<");

  const unpublished = renderDetail(unpublishedSpecies());

  expect(unpublished).toContain(">Editar<");
  expect(unpublished).toContain(">Republicar<");
  expect(unpublished).toContain(">Eliminar publicación<");
  expect(unpublished).not.toContain(">Despublicar<");
  expect(unpublished).not.toMatch(/disabled=""[^>]*>(Editar|Republicar)</);

  // En la lista cada fila abre su detalle con «Revisar» y muestra su estado con texto.
  const list = renderList(
    listState([
      row({ id: 1, status: "published" }),
      row({ id: 2, status: "unpublished", common_name: "Cebra" }),
    ]),
  );

  expect(list.match(/>Revisar<\/button>/g)).toHaveLength(2);
  expect(list).toContain("Publicada");
  expect(list).toContain("Despublicada");
  expect(list).toMatch(/species-badge"><svg/);
  expect(list).not.toContain("Solicitud pendiente");
});

it("CA-57 published-species-list: Editar y Republicar deshabilitados con aviso y enlace; Despublicar y Eliminar disponibles", () => {
  const notice = "Esta especie tiene una solicitud pendiente. Revísala en la pestaña Solicitudes.";
  const onOpen = vi.fn();

  // Lista: etiqueta, botones deshabilitados, aviso y enlace.
  const list = renderList(listState([row({ has_pending_request: true, status: "unpublished" })]), onOpen);

  expect(list).toContain("Solicitud pendiente");
  expect(list).toMatch(/disabled=""[^>]*>Editar</);
  expect(list).toMatch(/disabled=""[^>]*>Republicar</);
  expect(list).toContain(notice);
  expect(list).toContain(">Ver la solicitud<");

  // Detalle de una despublicada: Eliminar sigue disponible.
  const unpublished = renderDetail(unpublishedSpecies({ publication_status: "pending", has_pending_request: true }));

  expect(unpublished).toMatch(/disabled=""[^>]*>Editar</);
  expect(unpublished).toMatch(/disabled=""[^>]*>Republicar</);
  expect(unpublished).toContain(notice);
  expect(unpublished).toContain(">Ver la solicitud<");
  expect(unpublished).not.toMatch(/disabled=""[^>]*>Eliminar publicación</);

  // Detalle de una publicada con solicitud (la API informa `pending`, no `published`):
  // Despublicar y Eliminar disponibles.
  const published = renderDetail(publication({ publication_status: "pending", has_pending_request: true }));

  expect(published).toMatch(/>Despublicar</);
  expect(published).not.toMatch(/disabled=""[^>]*>Despublicar</);
  expect(published).not.toMatch(/disabled=""[^>]*>Eliminar publicación</);
  expect(published).toMatch(/disabled=""[^>]*>Editar</);
  expect(published).toMatch(/disabled=""[^>]*>Republicar</);
});
