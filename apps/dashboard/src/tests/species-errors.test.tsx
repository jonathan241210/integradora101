import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import {
  loadPublishedList,
  openPublished,
  republishSpecies,
  savePublishedEdit,
  startPublishedEdit,
  unpublishSpecies,
} from "../viewmodels/published-species";
import { loadRequestList, openRequest } from "../viewmodels/species-requests";
import { describeSpeciesError, isStateConflict } from "../viewmodels/species-publication-shared";
import { apiError, fakeApi, harness, viewModelFor } from "./species-fixtures";
import {
  fakePublishedApi,
  publishedHarness,
  publishedViewModel,
  unpublishedSpecies,
} from "./species-published-fixtures";

const requestsHtml = (state: ReturnType<typeof harness>["state"]) =>
  renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(state)} />);
const publishedHtml = (state: ReturnType<typeof publishedHarness>["state"]) =>
  renderToStaticMarkup(<PublishedSpeciesView {...publishedViewModel(state)} />);

it("CA-17 species-errors: 401 sin lógica propia; 403, 404 y 5xx por sección de solicitudes", async () => {
  // 401: el ViewModel no escribe estado ni mensaje; lo atiende el manejador global.
  const { api, requests } = fakeApi();
  const unauthorized = harness(api);

  requests.list.mockRejectedValueOnce(apiError(401, "No autenticado."));
  await loadRequestList(unauthorized.ctx, { filter: "", page: 1 });
  expect(unauthorized.actions.some((action) => action.type === "list-failed")).toBe(false);
  expect(describeSpeciesError(apiError(401, "x"), "requests").unauthorized).toBe(true);

  requests.get.mockRejectedValueOnce(apiError(401, "No autenticado."));
  await openRequest(unauthorized.ctx, 7);
  expect(unauthorized.actions.some((action) => action.type === "detail-failed")).toBe(false);

  // 403: aviso de la sección, sin filas ni Reintentar.
  const forbidden = harness(api);

  requests.list.mockRejectedValueOnce(apiError(403, "Prohibido"));
  await loadRequestList(forbidden.ctx, { filter: "", page: 1 });
  expect(forbidden.state.list.forbidden).toBe(true);
  expect(forbidden.state.list.error).toBe("No tienes permiso para revisar solicitudes de especies.");

  // 404 en el detalle: «Solicitud no encontrada.» con «Volver a la lista», sin datos anteriores.
  const missing = harness(api);

  requests.get.mockRejectedValueOnce(apiError(404, "Not found"));
  await openRequest(missing.ctx, 99);
  expect(missing.state.detail.status).toBe("not-found");
  expect(missing.state.detail.data).toBeNull();

  const notFound = requestsHtml(missing.state);

  expect(notFound).toContain("Solicitud no encontrada.");
  expect(notFound).toContain("Volver a la lista");
  expect(notFound).not.toContain("Reintentar");

  // 5xx y red: «Reintentar», en lista y en detalle, sin filas ni datos anteriores.
  for (const failure of [apiError(500, "Error del servidor."), new TypeError("fetch failed")]) {
    const list = harness(api);

    requests.list.mockRejectedValueOnce(failure);
    await loadRequestList(list.ctx, { filter: "", page: 1 });
    expect(list.state.list.items).toEqual([]);
    expect(requestsHtml(list.state)).toContain("Reintentar");

    const detail = harness(api);

    requests.get.mockRejectedValueOnce(failure);
    await openRequest(detail.ctx, 7);
    expect(detail.state.detail.data).toBeNull();
    expect(requestsHtml(detail.state)).toContain("Reintentar");
  }
});

it("CA-01 species-errors: 403 en la sección muestra el aviso de denegado", async () => {
  const { api, requests } = fakeApi();
  const h = harness(api);

  requests.list.mockRejectedValueOnce(apiError(403, "This action is unauthorized."));
  await loadRequestList(h.ctx, { filter: "", page: 1 });

  const html = requestsHtml(h.state);

  expect(html).toContain("No tienes permiso para revisar solicitudes de especies.");
  expect(html).toContain('role="alert"');
  expect(html).not.toContain("Reintentar");
  expect(html).not.toContain("<table");
  expect(html).not.toContain("León africano");

  // 403 en el detalle: mismo aviso y sin «Reintentar».
  requests.get.mockRejectedValueOnce(apiError(403, "Prohibido"));
  await openRequest(h.ctx, 7);
  expect(requestsHtml(h.state)).toContain("No tienes permiso para revisar solicitudes de especies.");
  expect(requestsHtml(h.state)).not.toContain("Reintentar");
});

it("CA-58 species-errors: errores de publicadas por estado", async () => {
  const { api, species } = fakePublishedApi();

  // 401: sin lógica propia.
  const unauthorized = publishedHarness(api);

  species.list.mockRejectedValueOnce(apiError(401, "No autenticado."));
  await loadPublishedList(unauthorized.ctx, { status: "", category: "", page: 1 });
  expect(unauthorized.actions.some((action) => action.type === "list-failed")).toBe(false);

  // 403 en la lista y por URL (CA-50): aviso de la sección, sin filtros ni tabla.
  const forbidden = publishedHarness(api);

  species.list.mockRejectedValueOnce(apiError(403, "Prohibido"));
  await loadPublishedList(forbidden.ctx, { status: "", category: "", page: 1 });

  const denied = publishedHtml(forbidden.state);

  expect(denied).toContain("No tienes permiso para gestionar especies publicadas.");
  expect(denied).not.toContain("Reintentar");
  expect(denied).not.toContain("<table");

  // 404 en el detalle.
  const missing = publishedHarness(api);

  species.get.mockRejectedValueOnce(apiError(404, "Not found"));
  await openPublished(missing.ctx, 99);
  expect(missing.state.detail.status).toBe("not-found");
  expect(publishedHtml(missing.state)).toContain("Especie no encontrada.");

  // 5xx y red: «Reintentar» y ningún dato anterior como actual.
  for (const failure of [apiError(503, "No disponible."), new TypeError("fetch failed")]) {
    const list = publishedHarness(api);

    species.list.mockRejectedValueOnce(failure);
    await loadPublishedList(list.ctx, { status: "", category: "", page: 1 });
    expect(list.state.list.items).toEqual([]);
    expect(publishedHtml(list.state)).toContain("Reintentar");
    expect(publishedHtml(list.state)).not.toContain("León africano");

    const detail = publishedHarness(api);

    species.get.mockRejectedValueOnce(failure);
    await openPublished(detail.ctx, 3);
    expect(detail.state.detail.data).toBeNull();
    expect(publishedHtml(detail.state)).toContain("Reintentar");
  }

  // 422 de estado (la API lo informa bajo `species`): mensaje y recarga, no campo.
  const state422 = apiError(422, "Esta especie no está publicada.", {
    species: ["Esta especie no está publicada."],
  });

  expect(isStateConflict(describeSpeciesError(state422, "published"))).toBe(true);

  const stale = publishedHarness(api);

  await openPublished(stale.ctx, 3);
  stale.ctx.dispatch({ type: "action-opened", action: "unpublish" });
  species.unpublish.mockRejectedValueOnce(state422);
  species.get.mockResolvedValueOnce(unpublishedSpecies());
  await unpublishSpecies(stale.ctx);
  expect(stale.state.notice).toBe("Esta especie no está publicada.");
  expect(stale.state.detail.data?.is_published).toBe(false);
  expect(stale.state.pendingAction).toBeNull();

  // 422 por campo al guardar: junto al campo, sin cerrar el formulario ni recargar.
  const editing = publishedHarness(api);

  species.get.mockResolvedValueOnce(unpublishedSpecies());
  await openPublished(editing.ctx, 3);
  startPublishedEdit(editing.ctx);
  editing.ctx.dispatch({ type: "draft-changed", changes: { habitat: "Selva" } });
  species.update.mockRejectedValueOnce(
    apiError(422, "El hábitat no es válido.", { habitat: ["El hábitat no es válido."] }),
  );
  const loads = species.get.mock.calls.length;

  await savePublishedEdit(editing.ctx);
  expect(editing.state.mode).toBe("edit");
  expect(editing.state.fieldErrors.habitat).toEqual(["El hábitat no es válido."]);
  expect(species.get.mock.calls.length).toBe(loads);
  expect(publishedHtml(editing.state)).toContain("El hábitat no es válido.");

  // 422 de republicar sin pista cuando no es por foto o datos.
  const republish = publishedHarness(api);

  species.get.mockResolvedValueOnce(unpublishedSpecies());
  await openPublished(republish.ctx, 3);
  species.republish.mockRejectedValueOnce(
    apiError(422, "Esta especie ya está publicada.", { species: ["Esta especie ya está publicada."] }),
  );
  species.get.mockResolvedValueOnce(unpublishedSpecies({ is_published: true, unpublished_at: null }));
  await republishSpecies(republish.ctx);
  expect(republish.state.notice).toBe("Esta especie ya está publicada.");
});
