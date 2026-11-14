import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import {
  initialSpeciesRequestsState,
  loadRequestList,
  speciesRequestsReducer,
} from "../viewmodels/species-requests";
import { apiError, fakeApi, harness, stateWith, summary, viewModelFor } from "./species-fixtures";

const listState = (items: ReturnType<typeof summary>[], hasMore = false, page = 1) =>
  stateWith({
    page,
    list: { status: "ready", items, hasMore, error: "", forbidden: false },
  });

const render = (state: ReturnType<typeof stateWith>) =>
  renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(state)} />);

it("CA-02 species-requests-list: cambiar el filtro vuelve a pedir la API; «Todas» omite status; «Siguiente» según meta.has_more", async () => {
  const { api, requests } = fakeApi();
  requests.list.mockResolvedValueOnce({ data: [summary()], meta: { has_more: true } });
  const h = harness(api);

  await loadRequestList(h.ctx, { filter: "", page: 1 });
  await loadRequestList(h.ctx, { filter: "rejected", page: 2 });

  expect(requests.list).toHaveBeenNthCalledWith(1, { status: undefined, page: 1 });
  expect(requests.list).toHaveBeenNthCalledWith(2, { status: "rejected", page: 2 });
  expect(h.state.list.hasMore).toBe(false);

  // El cambio de filtro vuelve a la página 1 y limpia filas: la API filtra.
  const changed = speciesRequestsReducer(h.state, { type: "filter-changed", filter: "accepted" });

  expect(changed.filter).toBe("accepted");
  expect(changed.page).toBe(1);
  expect(changed.list.items).toEqual([]);

  const withMore = render(listState([summary()], true));
  const withoutMore = render(listState([summary()], false));

  expect(withMore).toMatch(/Siguiente<\/button>/);
  expect(withMore).not.toMatch(/disabled=""[^>]*>Siguiente/);
  expect(withoutMore).toMatch(/disabled=""[^>]*>Siguiente/);
  expect(withMore).toMatch(/disabled=""[^>]*>Anterior/);
  expect(withMore).toContain("Todas");
});

it("CA-04 species-requests-list: vacío, cargando y error con Reintentar; sin filas anteriores", async () => {
  expect(render(stateWith({ list: { ...initialSpeciesRequestsState.list, status: "loading" } }))).toContain(
    "Cargando solicitudes…",
  );
  expect(
    render(stateWith({ list: { status: "empty", items: [], hasMore: false, error: "", forbidden: false } })),
  ).toContain("No hay solicitudes con este estado.");

  const { api, requests } = fakeApi();
  requests.list.mockRejectedValueOnce(apiError(500, "Error del servidor."));
  const h = harness(api, listState([summary()]));

  await loadRequestList(h.ctx, { filter: "", page: 1 });

  expect(h.state.list.status).toBe("error");
  expect(h.state.list.items).toEqual([]);

  const html = render(h.state);

  expect(html).toContain("Error del servidor.");
  expect(html).toContain("Reintentar");
  expect(html).not.toContain("León africano");

  // 403: aviso de denegado, sin filtro ni tabla (CA-01).
  const denied = harness(api);
  requests.list.mockRejectedValueOnce(apiError(403, "Prohibido"));
  await loadRequestList(denied.ctx, { filter: "", page: 1 });

  expect(render(denied.state)).toContain("No tienes permiso para revisar solicitudes de especies.");
  expect(render(denied.state)).not.toContain("Reintentar");
});

it("CA-03 species-requests-list: fila con tipo, «Especie despublicada», truncado a 60 y estado con icono", () => {
  const long = "Nombre científico muy largo ".repeat(4);
  const html = render(
    listState([
      summary({ scientific_name: long, request_type: "update", publication_status: "unpublished" }),
      summary({ id: 8, common_name: "Cebra", publication_status: "published", request_type: "publish" }),
    ]),
  );

  expect(html).toContain("León africano");
  expect(html).toContain(`${long.slice(0, 60)}…`);
  expect(html).not.toContain(long);
  expect(html).toContain("Mamífero");
  expect(html).toContain("Ana Pérez");
  expect(html).toContain("Actualización");
  expect(html).toContain("Primera publicación");
  expect(html.match(/Especie despublicada/g)).toHaveLength(1);
  expect(html).toContain("Pendiente");
  expect(html).toMatch(/species-badge"><svg/);
});

it("CA-15 species-requests-list: Revisar en Pendiente y Publicada; Ver en Rechazada", () => {
  const html = render(
    listState([
      summary({ id: 1, status: "submitted" }),
      summary({ id: 2, status: "accepted" }),
      summary({ id: 3, status: "rejected" }),
    ]),
  );

  expect(html.match(/>Revisar<\/button>/g)).toHaveLength(2);
  expect(html.match(/>Ver<\/button>/g)).toHaveLength(1);
});
