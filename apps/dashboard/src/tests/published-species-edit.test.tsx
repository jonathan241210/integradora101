import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import {
  cancelPublishedEdit,
  choosePublishedPhoto,
  openPublished,
  publishedIsDirty,
  republishSpecies,
  savePublishedEdit,
  startPublishedEdit,
} from "../viewmodels/published-species";
import { apiError } from "./species-fixtures";
import {
  fakePublishedApi,
  pendingSpecies,
  publication,
  publishedHarness,
  publishedViewModel,
  unpublishedSpecies,
} from "./species-published-fixtures";

const png = () => new File([new Uint8Array(10)], "n.png", { type: "image/png" });

async function editing(data = unpublishedSpecies()) {
  const fake = fakePublishedApi();

  fake.species.get.mockResolvedValue(data);

  const h = publishedHarness(fake.api);

  await openPublished(h.ctx, data.id);
  startPublishedEdit(h.ctx);

  return { ...fake, h };
}

const render = (state: ReturnType<typeof publishedHarness>["state"]) =>
  renderToStaticMarkup(<PublishedSpeciesDetailView {...publishedViewModel(state)} />);

it("CA-55 published-species-edit: PATCH sin publicar; 422 junto al campo; Cancelar sin llamada", async () => {
  const { h, species } = await editing();

  // Formulario precargado con la ficha publicada y nombre común solo como texto.
  const form = render(h.state);

  expect(h.state.mode).toBe("edit");
  expect(species.get).toHaveBeenCalledWith(3);
  expect(form).toContain("Nombre común (no editable)");
  expect(form).not.toMatch(/name="common_name"/);
  expect(form).toContain('name="scientific_name"');
  expect(form).toContain('value="Sabana"');
  expect(form).toContain("Área de distribución natural");
  expect(form.match(/type="checkbox"[^>]*checked/g)).toHaveLength(3);
  expect(form).toContain("Cambiar foto");
  expect(form).toContain("Guardar cambios");

  // PATCH solo con campos cambiados; la especie sigue despublicada.
  species.update.mockResolvedValueOnce(unpublishedSpecies({ habitat: "Selva" }));
  h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "  Selva  " } });

  expect(await savePublishedEdit(h.ctx)).toBe(true);
  expect(species.update).toHaveBeenCalledWith(3, { habitat: "Selva", category: "mammal" });
  expect(species.republish).not.toHaveBeenCalled();
  expect(species.unpublish).not.toHaveBeenCalled();
  expect(h.state.mode).toBe("read");
  expect(h.state.detail.data?.is_published).toBe(false);
  expect(h.state.notice).toBe("Cambios guardados. La especie sigue despublicada.");

  // Con foto: la entrada lleva el archivo y se vuelve a pedir la foto publicada.
  startPublishedEdit(h.ctx);
  choosePublishedPhoto(h.ctx, png());
  species.image.mockClear();
  species.update.mockResolvedValueOnce(unpublishedSpecies());
  await savePublishedEdit(h.ctx);
  expect((species.update.mock.calls[1][1] as { image: unknown }).image).toBeInstanceOf(File);
  expect(species.image).toHaveBeenCalledTimes(1);

  // 422 por campo: junto al campo, formulario abierto.
  startPublishedEdit(h.ctx);
  h.ctx.dispatch({ type: "draft-changed", changes: { origin: "Asia" } });
  species.update.mockRejectedValueOnce(
    apiError(422, "El origen no es válido.", { origin: ["El origen no es válido."] }),
  );
  await savePublishedEdit(h.ctx);
  expect(h.state.mode).toBe("edit");
  expect(h.state.fieldErrors.origin).toEqual(["El origen no es válido."]);
  expect(render(h.state)).toContain("El origen no es válido.");

  // Cancelar descarta sin llamada.
  const calls = species.update.mock.calls.length;

  cancelPublishedEdit(h.ctx);
  expect(h.state.mode).toBe("read");
  expect(h.state.draft).toBeNull();
  expect(species.update.mock.calls.length).toBe(calls);
});

it("CA-55 published-species-edit: solo se edita una despublicada sin solicitud pendiente", async () => {
  const published = await editing(publication());

  expect(published.h.state.mode).toBe("read");

  const pending = await editing(pendingSpecies({ is_published: false, unpublished_at: "2026-11-11T10:00:00Z" }));

  expect(pending.h.state.mode).toBe("read");
  expect(render(pending.h.state)).toMatch(/disabled=""[^>]*>Editar</);
});

it("CA-10 published-species-edit: republicar deshabilitado con cambios sin guardar", async () => {
  const { h, species } = await editing();

  expect(publishedIsDirty(h.state)).toBe(false);
  expect(render(h.state)).not.toMatch(/disabled=""[^>]*>Republicar</);

  h.ctx.dispatch({ type: "draft-changed", changes: { scientific_name: "Otro" } });
  expect(publishedIsDirty(h.state)).toBe(true);

  const dirty = render(h.state);

  expect(dirty).toMatch(/disabled=""[^>]*>Republicar</);
  expect(dirty).toContain("Guarda los cambios antes de publicar.");
  expect(await republishSpecies(h.ctx)).toBe(false);
  expect(species.republish).not.toHaveBeenCalled();

  // Una foto elegida también cuenta; al guardar se habilita de nuevo.
  h.ctx.dispatch({ type: "draft-changed", changes: { scientific_name: "Panthera leo" } });
  expect(publishedIsDirty(h.state)).toBe(false);
  choosePublishedPhoto(h.ctx, png());
  expect(publishedIsDirty(h.state)).toBe(true);
  expect(render(h.state)).toMatch(/disabled=""[^>]*>Republicar</);

  species.update.mockResolvedValueOnce(unpublishedSpecies());
  await savePublishedEdit(h.ctx);
  expect(render(h.state)).not.toMatch(/disabled=""[^>]*>Republicar</);
});
