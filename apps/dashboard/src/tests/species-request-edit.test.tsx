import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import {
  cancelRequestEdit,
  chooseRequestPhoto,
  openRequest,
  requestIsDirty,
  saveRequestEdit,
  startRequestEdit,
} from "../viewmodels/species-requests";
import { apiError, fakeApi, harness, requestDetail, viewModelFor } from "./species-fixtures";

const png = (size = 10) => new File([new Uint8Array(size)], "n.png", { type: "image/png" });

async function editing() {
  const fake = fakeApi();
  const h = harness(fake.api);

  await openRequest(h.ctx, 7);
  startRequestEdit(h.ctx);

  return { ...fake, h };
}

const render = (state: ReturnType<typeof harness>["state"]) =>
  renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(state)} />);

it("CA-07 species-request-edit: PATCH solo con campos cambiados; éxito deja la solicitud pendiente", async () => {
  const { h, requests } = await editing();
  const saved = requestDetail({}, {}, { habitat: "Sabana nueva" });

  requests.update.mockResolvedValueOnce(saved);
  h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "  Sabana nueva  " } });

  expect(await saveRequestEdit(h.ctx)).toBe(true);
  expect(requests.update).toHaveBeenCalledWith(7, { habitat: "Sabana nueva", category: "mammal" });
  expect(h.state.mode).toBe("read");
  expect(h.state.detail.data?.status).toBe("submitted");
  expect(h.state.notice).toBe("Cambios guardados. La solicitud sigue pendiente.");

  // Con foto elegida, la entrada lleva el archivo y los demás campos solo si cambiaron.
  startRequestEdit(h.ctx);
  chooseRequestPhoto(h.ctx, png());
  h.ctx.dispatch({ type: "draft-changed", changes: { published_fields: ["origin"] } });
  await saveRequestEdit(h.ctx);

  const input = requests.update.mock.calls[1][1] as Record<string, unknown>;

  expect(input.image).toBeInstanceOf(File);
  expect(input.published_fields).toEqual(["origin"]);
  expect(input).not.toHaveProperty("habitat");
});

it("CA-07 species-request-edit: nombre común como texto y sin campo editable; casillas precargadas", async () => {
  const { h } = await editing();
  const html = render(h.state);

  expect(html).toContain("Nombre común (no editable)");
  expect(html).not.toMatch(/name="common_name"/);
  expect(html).toContain('name="scientific_name"');
  expect(html).toContain('name="habitat"');
  expect(html).toContain('name="origin"');
  expect(html).toContain('name="category"');
  expect(html).toContain("Área de distribución natural");
  expect(html).toContain("Qué mostrar en la ficha pública");
  expect(html.match(/type="checkbox"[^>]*checked/g)).toHaveLength(3);
  expect(html).toContain("Cambiar foto");
  expect(html).toContain("Guardar cambios");
  for (const label of ["Mamífero", "Ave", "Reptil", "Anfibio", "Pez", "Invertebrado"]) {
    expect(html).toContain(label);
  }
});

it("CA-08 species-request-edit: 422 junto al campo sin cerrar; Cancelar sin llamada", async () => {
  const { h, requests } = await editing();

  requests.update.mockRejectedValueOnce(
    apiError(422, "Inválido", { habitat: ["Hábitat: máximo 150 caracteres."] }),
  );
  h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "Selva" } });

  expect(await saveRequestEdit(h.ctx)).toBe(false);
  expect(h.state.mode).toBe("edit");
  expect(h.state.fieldErrors.habitat).toEqual(["Hábitat: máximo 150 caracteres."]);
  expect(render(h.state)).toContain("Hábitat: máximo 150 caracteres.");

  // Más de 150 caracteres: error de presentación, sin llamar a la API.
  h.ctx.dispatch({ type: "draft-changed", changes: { origin: "x".repeat(151) } });
  const calls = requests.update.mock.calls.length;

  await saveRequestEdit(h.ctx);
  expect(requests.update.mock.calls.length).toBe(calls);
  expect(h.state.fieldErrors.origin).toEqual(["Máximo 150 caracteres."]);

  cancelRequestEdit(h.ctx);
  expect(h.state.mode).toBe("read");
  expect(h.state.draft).toBeNull();
  expect(requests.update.mock.calls.length).toBe(calls);
});

it("CA-08 species-request-edit: ayuda «Vacío: se mantiene el valor actual.» junto a cada corrección", async () => {
  const { h } = await editing();

  expect(render(h.state).match(/Vacío: se mantiene el valor actual\./g)).toHaveLength(3);
});

it("CA-09 species-request-edit: 422 «ya fue revisada» recarga el detalle", async () => {
  const { h, requests } = await editing();

  requests.update.mockRejectedValueOnce(apiError(422, "Esta solicitud ya fue revisada."));
  requests.get.mockResolvedValueOnce(requestDetail({ status: "accepted" }));
  h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "Selva" } });

  await saveRequestEdit(h.ctx);

  expect(requests.get).toHaveBeenCalledTimes(2);
  expect(h.state.detail.data?.status).toBe("accepted");
  expect(h.state.mode).toBe("read");
  expect(h.state.notice).toBe("Esta solicitud ya fue revisada.");

  const html = render(h.state);

  expect(html).not.toContain(">Editar<");
  expect(html).toContain("Publicada en el catálogo");

  // Publicada o Rechazada no ofrecen «Editar» y no pueden entrar a edición.
  startRequestEdit(h.ctx);
  expect(h.state.mode).toBe("read");
});

it("CA-10 species-request-edit: dirty activo con cambios sin guardar", async () => {
  const { h } = await editing();

  expect(requestIsDirty(h.state)).toBe(false);
  h.ctx.dispatch({ type: "draft-changed", changes: { scientific_name: "Otro" } });
  expect(requestIsDirty(h.state)).toBe(true);
  h.ctx.dispatch({ type: "draft-changed", changes: { scientific_name: "Panthera leo" } });
  expect(requestIsDirty(h.state)).toBe(false);
  chooseRequestPhoto(h.ctx, png());
  expect(requestIsDirty(h.state)).toBe(true);
});

it("CA-49 species-request-edit: vista previa, revocación al cancelar y cambio de solicitud", async () => {
  const { h, requests } = await editing();

  chooseRequestPhoto(h.ctx, png());

  const url = h.state.newPhoto.previewUrl;

  expect(url).toMatch(/^blob:/);
  expect(requests.update).not.toHaveBeenCalled();
  expect(render(h.state)).toContain('alt="Vista previa de la nueva foto de León africano"');

  chooseRequestPhoto(h.ctx, png());
  expect(h.revoked).toContain(url);

  const second = h.state.newPhoto.previewUrl;

  cancelRequestEdit(h.ctx);
  expect(h.revoked).toContain(second);
  expect(h.state.newPhoto.file).toBeNull();

  startRequestEdit(h.ctx);
  chooseRequestPhoto(h.ctx, png());

  const third = h.state.newPhoto.previewUrl;

  await openRequest(h.ctx, 8);
  expect(h.revoked).toContain(third);
  expect(h.state.newPhoto.previewUrl).toBe("");
});

it("CA-49 species-request-edit: control de foto con mensajes de error exactos", async () => {
  const { h } = await editing();

  chooseRequestPhoto(h.ctx, new File(["x"], "a.gif", { type: "image/gif" }));
  expect(h.state.newPhoto.error).toBe("Elige una imagen JPG o PNG.");
  expect(h.state.newPhoto.file).toBeNull();
  expect(render(h.state)).toContain("Elige una imagen JPG o PNG.");

  chooseRequestPhoto(h.ctx, png(5 * 1024 * 1024 + 1));
  expect(h.state.newPhoto.error).toBe("La foto no puede superar 5 MB.");
  expect(render(h.state)).toContain("La foto no puede superar 5 MB.");
  expect(render(h.state)).toContain("JPG o PNG · máximo 5 MB");
});
