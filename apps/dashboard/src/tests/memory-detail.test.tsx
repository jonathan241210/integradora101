import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemoryReviewDetailView } from "../views/MemoryReviewDetailView";
import { loadList, openDetail, type MemoryDetailState } from "../viewmodels/memory-review";
import {
  apiError,
  detail,
  detailHarness,
  detailStateWith,
  detailViewModel,
  fakeApi,
  listHarness,
  summary,
} from "./memory-fixtures";

const ready = { status: "ready", url: "blob:test/1" } as const;
const render = (state: MemoryDetailState) =>
  renderToStaticMarkup(<MemoryReviewDetailView {...detailViewModel(state)} onBack={() => undefined} />);
const section = (html: string, from: string) => html.slice(html.indexOf(from));

it("CA-05 memory-detail: abrir pide el detalle una vez por petición", async () => {
  const { api, review } = fakeApi();
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);

  expect(review.get).toHaveBeenCalledTimes(1);
  expect(review.get).toHaveBeenCalledWith(11);
  // El ViewModel no envía ninguna acción adicional: la API pasa a En proceso.
  expect(review.accept).not.toHaveBeenCalled();
  expect(review.reject).not.toHaveBeenCalled();
  expect(h.state.data?.status).toBe("in_review");

  // Al volver, la lista se pide de nuevo y la fila muestra el estado nuevo.
  review.list
    .mockResolvedValueOnce({ data: [summary({ status: "submitted" })], meta: { has_more: false } })
    .mockResolvedValueOnce({ data: [summary({ status: "in_review" })], meta: { has_more: false } });
  const list = listHarness(api);

  await loadList(list.ctx, { filter: "", page: 1 });
  expect(list.state.items[0].status).toBe("submitted");
  await loadList(list.ctx, { filter: "", page: 1 });
  expect(list.state.items[0].status).toBe("in_review");
  expect(review.list).toHaveBeenCalledTimes(2);
});

it("CA-05 memory-detail: muestra la opinión y la imagen antes de decidir", () => {
  const html = render(detailStateWith({ image: ready }));

  expect(html).toContain("Mi primer viaje al zoológico fue inolvidable.");
  expect(html).toContain('src="blob:test/1"');
  expect(html.indexOf("Mi primer viaje")).toBeLessThan(html.indexOf(">Aceptar<"));
  expect(html.indexOf('src="blob:test/1"')).toBeLessThan(html.indexOf(">Aceptar<"));
  expect(html.indexOf('src="blob:test/1"')).toBeLessThan(html.indexOf(">Rechazar<"));
  expect(render({ ...detailStateWith({}), status: "loading", data: null })).toContain("Cargando petición…");
});

it("CA-06 memory-detail: imagen completa con alt «Foto enviada por un visitante»; opinión como texto, no HTML", () => {
  const html = render(
    detailStateWith({ image: ready, data: detail({ opinion: '<img src=x onerror="alert(1)"><b>hola</b>' }) }),
  );

  expect(html).toContain('alt="Foto enviada por un visitante"');
  expect(html).toContain("&lt;b&gt;hola&lt;/b&gt;");
  expect(html).not.toContain("<b>hola</b>");
  expect(html).not.toContain("<img src=x");
  expect(render(detailStateWith({ image: ready, data: detail({ opinion: null }) }))).toContain("Sin opinión");
});

it("CA-06 memory-detail: error de imagen muestra «No se pudo cargar la imagen.»", () => {
  expect(render(detailStateWith({ image: { status: "error", url: "" } }))).toContain(
    "No se pudo cargar la imagen.",
  );
  expect(render(detailStateWith({ image: { status: "loading", url: "" } }))).toContain("Cargando la foto…");
  expect(render(detailStateWith({ image: { status: "error", url: "" } }))).not.toContain("<img");
});

it("CA-07 memory-detail: acciones por estado; Rechazada y Aceptada solo lectura", () => {
  for (const status of ["submitted", "in_review"] as const) {
    const html = render(detailStateWith({ image: ready, data: detail({ status }) }));

    expect(html, status).toContain(">Aceptar<");
    expect(html, status).toContain(">Rechazar<");
  }

  const rejected = render(
    detailStateWith({
      image: ready,
      data: detail({
        status: "rejected",
        rejection_reason: "La foto está borrosa",
        rejected_fields: ["image", "content"],
      }),
    }),
  );

  expect(rejected).toContain("Esperando la corrección del visitante.");
  expect(rejected).toContain("La foto está borrosa");
  expect(rejected).toContain("La foto, La opinión");
  expect(rejected).not.toMatch(/>(Aceptar|Rechazar)</);

  const accepted = render(
    detailStateWith({
      image: ready,
      data: detail({
        status: "accepted",
        published_at: "2026-11-12T10:00:00Z",
        published_until: "2026-11-19T10:00:00Z",
        is_published: true,
      }),
    }),
  );

  expect(accepted).toContain("Fecha de publicación");
  expect(accepted).toContain("Publicada en la galería hasta el");
  expect(accepted).not.toMatch(/>(Aceptar|Rechazar)</);
});

it("CA-15 memory-detail: estados con icono y texto", () => {
  const labels = { submitted: "Enviada", in_review: "En proceso", accepted: "Aceptada", rejected: "Rechazada" } as const;

  for (const [status, label] of Object.entries(labels)) {
    const html = render(detailStateWith({ data: detail({ status: status as keyof typeof labels }) }));
    const badge = html.slice(html.indexOf("memory-review__badge"));

    expect(badge, status).toMatch(/<svg[\s\S]*?<\/svg>/);
    expect(badge.slice(0, 600), status).toContain(label);
  }
});

it("CA-18 memory-detail: Aceptar deshabilitado con «No se puede aceptar sin la imagen.»; Rechazar disponible", () => {
  for (const image of [
    { status: "not-found", url: "" },
    { status: "error", url: "" },
  ] as const) {
    const html = render(detailStateWith({ image }));

    expect(html, image.status).toContain("No se pudo cargar la imagen.");
    expect(html, image.status).toContain("No se puede aceptar sin la imagen.");
    expect(html, image.status).toMatch(/disabled=""[^>]*>Aceptar</);
    expect(html, image.status).not.toMatch(/disabled=""[^>]*>Rechazar</);
  }

  // Cargando: Aceptar deshabilitado sin el texto de falta de imagen.
  const loading = render(detailStateWith({ image: { status: "loading", url: "" } }));

  expect(loading).toMatch(/disabled=""[^>]*>Aceptar</);
  expect(loading).not.toContain("No se puede aceptar sin la imagen.");

  expect(render(detailStateWith({ image: ready }))).not.toMatch(/disabled=""[^>]*>Aceptar</);
});

it("CA-19 memory-detail: texto de vigencia según is_published; el estado sigue Aceptada", () => {
  const base = { status: "accepted", published_at: "2026-11-12T10:00:00Z", published_until: "2026-11-19T10:00:00Z" } as const;
  const vigente = render(detailStateWith({ image: ready, data: detail({ ...base, is_published: true }) }));
  const vencida = render(detailStateWith({ image: ready, data: detail({ ...base, is_published: false }) }));

  expect(vigente).toMatch(/Publicada en la galería hasta el [^<]+\./);
  expect(vigente).not.toContain("La publicación venció el");
  expect(vencida).toMatch(/La publicación venció el [^<]+\./);
  expect(vencida).not.toContain("Publicada en la galería hasta el");
  expect(section(vigente, "memory-review__badge")).toContain("Aceptada");
  expect(section(vencida, "memory-review__badge")).toContain("Aceptada");
});

it("RN-06 memory-detail: textos de la vista en español", async () => {
  const html = render(detailStateWith({ image: ready }));

  for (const text of ["Revisar petición", "Volver a la lista", "Opinión", "Foto", "Aceptar", "Rechazar"]) {
    expect(html, text).toContain(text);
  }

  const { api, review } = fakeApi();
  review.get.mockRejectedValueOnce(apiError(404, "x"));
  const h = detailHarness(api);

  await openDetail(h.ctx, 99);

  expect(h.state.status).toBe("not-found");
  expect(render(h.state)).toContain("Petición no encontrada.");
});
