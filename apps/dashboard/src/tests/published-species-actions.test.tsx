import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import {
  openPublished,
  removePublication,
  republishSpecies,
  unpublishSpecies,
} from "../viewmodels/published-species";
import { apiError } from "./species-fixtures";
import {
  fakePublishedApi,
  publication,
  publishedHarness,
  publishedViewModel,
  unpublishedSpecies,
} from "./species-published-fixtures";

async function opened(data = publication()) {
  const fake = fakePublishedApi();

  fake.species.get.mockResolvedValue(data);

  const h = publishedHarness(fake.api);

  await openPublished(h.ctx, data.id);

  return { ...fake, h };
}

const render = (state: ReturnType<typeof publishedHarness>["state"]) =>
  renderToStaticMarkup(<PublishedSpeciesDetailView {...publishedViewModel(state)} />);

const stateError = (message: string) => apiError(422, message, { species: [message] });

it("CA-53 published-species-actions: POST de despublicar solo al confirmar; 422 recarga", async () => {
  const { h, species } = await opened();

  // Abrir y cancelar no llama a la API.
  h.ctx.dispatch({ type: "action-opened", action: "unpublish" });
  h.ctx.dispatch({ type: "action-closed" });
  expect(species.unpublish).not.toHaveBeenCalled();
  expect(h.state.pendingAction).toBeNull();

  // Confirmar: POST, aviso y la especie pasa a Despublicada en el detalle y en la lista.
  h.ctx.dispatch({ type: "action-opened", action: "unpublish" });
  expect(await unpublishSpecies(h.ctx)).toBe(true);
  expect(species.unpublish).toHaveBeenCalledWith(3);
  expect(h.state.notice).toBe("Especie despublicada. Ya no aparece en el catálogo público.");
  expect(h.state.detail.data?.is_published).toBe(false);
  expect(h.state.pendingAction).toBeNull();
  expect(h.refreshList).toHaveBeenCalled();
  expect(render(h.state)).toMatch(/Despublicada/);

  // 422: mensaje, recarga y sin más cambios.
  const stale = await opened();

  stale.h.ctx.dispatch({ type: "action-opened", action: "unpublish" });
  stale.species.unpublish.mockRejectedValueOnce(stateError("Esta especie no está publicada."));
  stale.species.get.mockResolvedValueOnce(unpublishedSpecies());

  expect(await unpublishSpecies(stale.h.ctx)).toBe(false);
  expect(stale.species.get).toHaveBeenCalledTimes(2);
  expect(stale.h.state.notice).toBe("Esta especie no está publicada.");
  expect(stale.h.state.detail.data?.is_published).toBe(false);
  expect(stale.h.state.pendingAction).toBeNull();
  expect(stale.species.update).not.toHaveBeenCalled();
});

it("CA-54 published-species-actions: republicar; 422 por foto o datos ausentes con pista a Editar", async () => {
  const { h, species } = await opened(unpublishedSpecies());

  h.ctx.dispatch({ type: "action-opened", action: "republish" });
  h.ctx.dispatch({ type: "action-closed" });
  expect(species.republish).not.toHaveBeenCalled();

  h.ctx.dispatch({ type: "action-opened", action: "republish" });
  expect(await republishSpecies(h.ctx)).toBe(true);
  expect(species.republish).toHaveBeenCalledWith(3);
  expect(h.state.notice).toBe("Especie republicada. Ya es visible en el catálogo público.");
  expect(h.state.detail.data?.is_published).toBe(true);
  expect(species.update).not.toHaveBeenCalled();

  // 422 por foto ausente: mensaje de la API, pista, recarga.
  const missing = await opened(unpublishedSpecies({ has_image: false }));

  missing.h.ctx.dispatch({ type: "action-opened", action: "republish" });
  missing.species.republish.mockRejectedValueOnce(
    stateError("No se puede republicar: faltan la foto o los datos publicados."),
  );
  expect(await republishSpecies(missing.h.ctx)).toBe(false);
  expect(missing.h.state.notice).toBe(
    "No se puede republicar: faltan la foto o los datos publicados. Añade la foto con «Editar» antes de republicar.",
  );
  expect(missing.species.get).toHaveBeenCalledTimes(2);
  expect(missing.h.state.pendingAction).toBeNull();

  // Otro 422 de estado: mensaje de la API sin pista.
  const already = await opened(unpublishedSpecies());

  already.h.ctx.dispatch({ type: "action-opened", action: "republish" });
  already.species.republish.mockRejectedValueOnce(stateError("Esta especie ya está publicada."));
  await republishSpecies(already.h.ctx);
  expect(already.h.state.notice).toBe("Esta especie ya está publicada.");

  // Con cambios sin guardar no se llama a la API (CA-10).
  const dirty = await opened(unpublishedSpecies());

  dirty.h.ctx.dispatch({ type: "edit-started" });
  dirty.h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "Otro" } });
  expect(await republishSpecies(dirty.h.ctx)).toBe(false);
  expect(dirty.species.republish).not.toHaveBeenCalled();
});

it("CA-56 published-species-actions: DELETE solo al confirmar", async () => {
  const { h, species } = await opened();

  h.ctx.dispatch({ type: "action-opened", action: "remove" });
  h.ctx.dispatch({ type: "action-closed" });
  expect(species.removePublication).not.toHaveBeenCalled();

  h.ctx.dispatch({ type: "action-opened", action: "remove" });
  expect(await removePublication(h.ctx)).toBe(true);
  expect(species.removePublication).toHaveBeenCalledWith(3);
  expect(h.state.notice).toBe(
    "La publicación se eliminó. Para publicarla de nuevo, el veterinario debe enviar una solicitud.",
  );
  // Sale de publicadas: el detalle se cierra y no queda foto ni datos publicados.
  expect(h.state.selectedId).toBeNull();
  expect(h.state.detail.data).toBeNull();
  expect(h.state.photo.url).toBe("");
  expect(h.refreshList).toHaveBeenCalled();

  // 422: mensaje y recarga.
  const gone = await opened(unpublishedSpecies());

  gone.h.ctx.dispatch({ type: "action-opened", action: "remove" });
  gone.species.removePublication.mockRejectedValueOnce(
    stateError("Esta especie no tiene publicación que eliminar."),
  );
  gone.species.get.mockResolvedValueOnce(
    publication({ publication_status: "not_published", is_published: false, has_image: false }),
  );
  await removePublication(gone.h.ctx);
  expect(gone.h.state.notice).toBe("Esta especie no tiene publicación que eliminar.");
  expect(gone.species.get).toHaveBeenCalledTimes(2);

  // Bloque propio con aviso y botón; diálogo con título, texto y dos botones exactos; sin casilla.
  const block = await opened();

  expect(render(block.h.state)).toContain("Esto elimina la foto y los datos publicados; la especie seguirá existiendo.");
  expect(render(block.h.state)).toMatch(/<section[^>]*aria-labelledby="published-remove-title"/);

  block.h.ctx.dispatch({ type: "action-opened", action: "remove" });

  const dialog = render(block.h.state);

  expect(dialog).toContain("¿Seguro que quieres eliminar la publicación?");
  expect(dialog).toContain(
    "Esto eliminará la foto y los datos publicados de la especie y marcará sus solicitudes como eliminadas. La especie y sus animales seguirán existiendo.",
  );
  expect(dialog).toMatch(/dialog-actions[\s\S]*Cancelar[\s\S]*Eliminar publicación<\/button>/);
  expect(dialog).not.toContain('type="checkbox"');
  // RN-16: sin líneas sobre correcciones.
  expect(dialog).not.toMatch(/correccion|revert/i);
});

it("CA-57 published-species-actions: 422 por solicitud pendiente recarga la especie", async () => {
  const { h, species } = await opened(unpublishedSpecies());

  h.ctx.dispatch({ type: "action-opened", action: "republish" });
  species.republish.mockRejectedValueOnce(
    stateError("Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar."),
  );
  species.get.mockResolvedValueOnce(
    unpublishedSpecies({ publication_status: "pending", has_pending_request: true }),
  );

  await republishSpecies(h.ctx);

  expect(h.state.notice).toBe(
    "Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.",
  );
  expect(h.state.detail.data?.has_pending_request).toBe(true);
  expect(render(h.state)).toMatch(/disabled=""[^>]*>Republicar</);
  // Despublicar y Eliminar no dependen de la solicitud.
  expect(render(h.state)).not.toMatch(/disabled=""[^>]*>Eliminar publicación</);
});

it("CA-53 published-species-actions: texto exacto del diálogo de despublicar", async () => {
  const { h } = await opened();

  h.ctx.dispatch({ type: "action-opened", action: "unpublish" });

  const html = render(h.state);

  expect(html).toContain(
    "¿Despublicar esta especie? Dejará de aparecer en el catálogo público. No se borra nada: la foto y los datos se conservan.",
  );
  expect(html).toMatch(/Cancelar[\s\S]*Confirmar<\/button>/);
  expect(html).not.toContain('type="checkbox"');
});

it("CA-54 published-species-actions: texto exacto del diálogo de republicar", async () => {
  const { h } = await opened(unpublishedSpecies());

  h.ctx.dispatch({ type: "action-opened", action: "republish" });

  const html = render(h.state);

  expect(html).toContain(
    "¿Republicar esta especie? Volverá a aparecer en el catálogo público con su foto y sus datos guardados.",
  );
  expect(html).toMatch(/Cancelar[\s\S]*Confirmar<\/button>/);
});

it("CA-59 published-species-actions: diálogos con role dialog y nombre accesible", async () => {
  const { h } = await opened(unpublishedSpecies());

  for (const action of ["unpublish", "republish", "remove"] as const) {
    h.ctx.dispatch({ type: "action-opened", action });

    const html = render(h.state);
    // `<dialog>` modal tiene rol dialog implícito; el nombre sale de su título.
    const labelled = /<dialog[^>]*aria-labelledby="([^"]+)"[^>]*>\s*<h2[^>]*id="\1"/.exec(html);

    expect(labelled, action).not.toBeNull();
    h.ctx.dispatch({ type: "action-closed" });
  }
});
