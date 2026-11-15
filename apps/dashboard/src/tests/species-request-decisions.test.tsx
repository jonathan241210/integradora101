import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import {
  acceptDialogCopy,
  acceptRequest,
  chooseRequestPhoto,
  openRequest,
  rejectRequest,
  requestActions,
  startRequestEdit,
} from "../viewmodels/species-requests";
import { apiError, fakeApi, harness, requestDetail, viewModelFor } from "./species-fixtures";

type Detail = ReturnType<typeof requestDetail>;

async function opened(detail: Detail = requestDetail()) {
  const fake = fakeApi();

  fake.requests.get.mockResolvedValue(detail);

  const h = harness(fake.api);

  await openRequest(h.ctx, detail.id);

  return { ...fake, h };
}

const render = (state: ReturnType<typeof harness>["state"]) =>
  renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(state)} />);

const unpublishedDetail = () =>
  requestDetail({ request_type: "update" }, { publication_status: "unpublished" });
const publishedDetail = (photo: boolean) =>
  requestDetail(
    { request_type: "update" },
    { publication_status: "published", is_published: true },
    { has_new_photo: photo },
  );

it("CA-10 species-request-decisions: aceptar deshabilitado con cambios sin guardar", async () => {
  const { h, requests } = await opened(unpublishedDetail());

  const clean = render(h.state);

  expect(clean).not.toMatch(/disabled=""[^>]*>Aceptar y publicar/);
  expect(clean).not.toContain("Guarda los cambios antes de publicar.");

  startRequestEdit(h.ctx);
  h.ctx.dispatch({ type: "draft-changed", changes: { habitat: "Cambio sin guardar" } });

  const dirty = render(h.state);

  expect(dirty).toMatch(/disabled=""[^>]*>Aceptar y publicar/);
  expect(dirty).toMatch(/disabled=""[^>]*>Aceptar sin publicar/);
  expect(dirty).toContain("Guarda los cambios antes de publicar.");
  expect(requestActions(requestDetail(), true).saveFirstNotice).toBe(
    "Guarda los cambios antes de publicar.",
  );

  // Una foto elegida también cuenta como cambio sin guardar.
  const photoCase = await opened();

  startRequestEdit(photoCase.h.ctx);
  chooseRequestPhoto(photoCase.h.ctx, new File(["x"], "n.png", { type: "image/png" }));
  expect(render(photoCase.h.state)).toMatch(/disabled=""[^>]*>Aceptar y publicar/);

  expect(await acceptRequest(h.ctx, true)).toBe(false);
  expect(requests.accept).not.toHaveBeenCalled();
});

it("CA-11 species-request-decisions: publish true solo al confirmar; Cancelar no llama a la API", async () => {
  const { h, requests } = await opened(publishedDetail(true));

  h.ctx.dispatch({ type: "decision-opened", decision: "accept-publish" });
  h.ctx.dispatch({ type: "decision-closed" });
  expect(requests.accept).not.toHaveBeenCalled();
  expect(h.state.pendingAction).toBeNull();

  expect(acceptDialogCopy(requestDetail(), "accept-publish").message).toBe(
    "¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.",
  );
  expect(acceptDialogCopy(publishedDetail(true), "accept-publish").message).toBe(
    "¿Aceptar esta actualización? La ficha pública cambiará: se reemplazarán la foto y los datos publicados.",
  );
  expect(acceptDialogCopy(publishedDetail(false), "accept-publish").message).toBe(
    "¿Aceptar esta actualización? La ficha pública cambiará: se reemplazarán los datos publicados.",
  );

  h.ctx.dispatch({ type: "decision-opened", decision: "accept-publish" });

  const dialog = render(h.state);

  expect(dialog).toContain("León africano");
  expect(dialog).toContain("Panthera leo");
  expect(dialog).toContain("¿Aceptar esta actualización?");

  requests.get.mockResolvedValue({ ...publishedDetail(true), status: "accepted" });

  expect(await acceptRequest(h.ctx, true)).toBe(true);
  expect(requests.accept).toHaveBeenCalledWith(7, { publish: true });
  expect(h.state.notice).toBe("Especie publicada. Ya es visible en el catálogo público.");
  expect(h.state.detail.data?.status).toBe("accepted");
  expect(h.state.pendingAction).toBeNull();

  const done = render(h.state);

  expect(done).toContain("Publicada en el catálogo");
  expect(done).not.toMatch(/>(Aceptar y publicar|Rechazar|Editar)</);
});

it("CA-12 species-request-decisions: 422 recarga y no cambia nada más", async () => {
  const { h, requests } = await opened();

  requests.accept.mockRejectedValueOnce(apiError(422, "Esta solicitud ya fue revisada."));
  requests.get.mockResolvedValue(requestDetail({ status: "rejected", rejection_reason: "Otra persona" }));
  h.ctx.dispatch({ type: "decision-opened", decision: "accept-publish" });

  expect(await acceptRequest(h.ctx, true)).toBe(false);
  expect(requests.get).toHaveBeenCalledTimes(2);
  expect(h.state.detail.data?.status).toBe("rejected");
  expect(h.state.pendingAction).toBeNull();
  expect(h.state.notice).toBe("Esta solicitud ya fue revisada.");
  expect(requests.update).not.toHaveBeenCalled();
});

it("CA-13 species-request-decisions: motivo obligatorio, contador y Confirmar deshabilitado; Cancelar no llama", async () => {
  const { h, requests } = await opened();

  h.ctx.dispatch({ type: "decision-opened", decision: "reject" });

  const empty = render(h.state);

  expect(empty).toContain("¿Seguro que quieres rechazar esta solicitud?");
  expect(empty).toContain("Motivo");
  expect(empty).toContain("0/500");
  expect(empty).toMatch(/disabled=""[^>]*>Confirmar/);
  expect(empty).toContain("Cancelar");
  expect(empty).not.toContain('type="checkbox"');

  expect(await rejectRequest(h.ctx, "   ")).toBe(false);
  expect(requests.reject).not.toHaveBeenCalled();
  expect(h.state.fieldErrors.rejection_reason?.[0]).toBeTruthy();

  h.ctx.dispatch({ type: "reject-reason-changed", reason: "Foto borrosa" });

  const filled = render(h.state);

  expect(filled).toContain("12/500");
  expect(filled).not.toMatch(/disabled=""[^>]*>Confirmar/);

  h.ctx.dispatch({ type: "decision-closed" });
  expect(h.state.pendingAction).toBeNull();
  expect(requests.reject).not.toHaveBeenCalled();

  // RN-09: el texto no promete notificar al veterinario.
  expect(filled).not.toMatch(/notific|avisar al veterinario/i);
});

it("CA-14 species-request-decisions: éxito muestra motivo y aviso; 422 de motivo junto al campo", async () => {
  const { h, requests } = await opened();

  requests.reject.mockRejectedValueOnce(
    apiError(422, "Inválido", { rejection_reason: ["El motivo es obligatorio."] }),
  );
  h.ctx.dispatch({ type: "decision-opened", decision: "reject" });

  expect(await rejectRequest(h.ctx, "Foto borrosa")).toBe(false);
  expect(h.state.pendingAction).toBe("reject");
  expect(h.state.fieldErrors.rejection_reason).toEqual(["El motivo es obligatorio."]);
  expect(render(h.state)).toContain("El motivo es obligatorio.");

  requests.reject.mockResolvedValueOnce(
    requestDetail({ status: "rejected", rejection_reason: "Foto borrosa" }),
  );

  expect(await rejectRequest(h.ctx, "  Foto borrosa  ")).toBe(true);
  expect(requests.reject).toHaveBeenLastCalledWith(7, { rejection_reason: "Foto borrosa" });
  expect(h.state.pendingAction).toBeNull();
  expect(h.state.notice).toBe("Solicitud rechazada. La especie no se publicó.");

  const html = render(h.state);

  expect(html).toContain("Foto borrosa");
  expect(html).toContain("Volver a la lista");
  expect(html).not.toMatch(/>(Aceptar y publicar|Rechazar|Editar)</);
});

it("CA-16 species-request-decisions: diálogos con role dialog y nombre accesible", async () => {
  const { h } = await opened(unpublishedDetail());

  for (const decision of ["accept-publish", "accept-unpublished", "reject"] as const) {
    h.ctx.dispatch({ type: "decision-opened", decision });

    const html = render(h.state);
    // `<dialog>` modal tiene rol dialog implícito; el nombre sale de su título.
    const labelled = /<dialog[^>]*aria-labelledby="([^"]+)"[^>]*>\s*<h2[^>]*id="\1"/.exec(html);

    expect(labelled, decision).not.toBeNull();
    h.ctx.dispatch({ type: "decision-closed" });
  }
});

it("CA-62 species-request-decisions: especie despublicada ofrece dos acciones con publish true o false; publicada o sin publicar solo una", async () => {
  expect(requestActions(unpublishedDetail(), false)).toMatchObject({
    canAcceptPublish: true,
    canAcceptUnpublished: true,
  });
  expect(requestActions(publishedDetail(true), false).canAcceptUnpublished).toBe(false);
  expect(requestActions(requestDetail(), false).canAcceptUnpublished).toBe(false);

  const first = await opened(requestDetail());
  const second = await opened(publishedDetail(false));

  expect(render(first.h.state)).not.toContain("Aceptar sin publicar");
  expect(render(second.h.state)).not.toContain("Aceptar sin publicar");

  const { h, requests } = await opened(unpublishedDetail());

  expect(render(h.state)).toContain(">Aceptar y publicar<");
  expect(render(h.state)).toContain(">Aceptar sin publicar<");

  expect(await acceptRequest(h.ctx, false)).toBe(true);
  expect(requests.accept).toHaveBeenLastCalledWith(7, { publish: false });
  expect(h.state.notice).toBe("Cambios aceptados. La especie sigue despublicada.");

  expect(await acceptRequest(h.ctx, true)).toBe(true);
  expect(requests.accept).toHaveBeenLastCalledWith(7, { publish: true });
});

it("CA-62 species-request-decisions: textos de los diálogos de aceptar", async () => {
  const detail = unpublishedDetail();

  expect(acceptDialogCopy(detail, "accept-publish").message).toBe(
    "¿Aceptar y publicar esta especie? Quedará visible en el catálogo público para los visitantes.",
  );
  expect(acceptDialogCopy(detail, "accept-unpublished").message).toBe(
    "¿Aceptar sin publicar? Los cambios quedarán guardados, pero la especie seguirá oculta en el catálogo. Podrás republicarla desde TulanPedia, pestaña «Publicadas».",
  );

  const { h } = await opened(detail);

  h.ctx.dispatch({ type: "decision-opened", decision: "accept-unpublished" });
  expect(render(h.state)).toContain("Aceptar sin publicar? Los cambios quedarán guardados");
});
