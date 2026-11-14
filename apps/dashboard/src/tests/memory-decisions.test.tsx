import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemoryReviewDetailView } from "../views/MemoryReviewDetailView";
import {
  acceptRequest,
  closeDecision,
  openDecision,
  openDetail,
  rejectRequest,
  type MemoryDetailState,
} from "../viewmodels/memory-review";
import { apiError, detail, detailHarness, detailViewModel, fakeApi } from "./memory-fixtures";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const render = (state: MemoryDetailState) =>
  renderToStaticMarkup(<MemoryReviewDetailView {...detailViewModel(state)} onBack={() => undefined} />);

async function opened(overrides: Parameters<typeof fakeApi>[0] = {}) {
  const fake = fakeApi(overrides);
  const h = detailHarness(fake.api);

  await openDetail(h.ctx, 11);

  return { ...fake, h };
}

const fill = (h: ReturnType<typeof detailHarness>, reason: string, fields: ("image" | "content")[]) => {
  openDecision(h.ctx, "reject");
  h.ctx.dispatch({ type: "reject-reason-changed", reason });
  for (const field of fields) h.ctx.dispatch({ type: "reject-field-toggled", field });
};

it("CA-08 memory-decisions: diálogo con plazo; solo Confirmar llama a accept", async () => {
  const { h, review } = await opened();

  openDecision(h.ctx, "accept");

  const dialog = render(h.state);

  expect(dialog).toContain("¿Aceptar esta petición?");
  expect(dialog).toContain(
    "La foto y la opinión se publicarán en la galería del portal durante 7 días desde la aceptación. Después dejarán de mostrarse.",
  );
  expect(dialog).toContain(">Confirmar<");
  expect(dialog).toContain(">Cancelar<");
  expect(review.accept).not.toHaveBeenCalled();

  expect(await acceptRequest(h.ctx, 11)).toBe(true);
  expect(review.accept).toHaveBeenCalledTimes(1);
  expect(review.accept).toHaveBeenCalledWith(11);
});

it("CA-08 memory-decisions: éxito recarga el detalle y muestra published_until", async () => {
  const { h, review } = await opened();

  review.get.mockResolvedValue(
    detail({
      status: "accepted",
      published_at: "2026-11-12T10:00:00Z",
      published_until: "2026-11-19T10:00:00Z",
      is_published: true,
    }),
  );
  openDecision(h.ctx, "accept");
  await acceptRequest(h.ctx, 11);

  expect(review.get).toHaveBeenCalledTimes(2);
  expect(h.state.data?.status).toBe("accepted");
  expect(h.state.pendingAction).toBeNull();
  expect(h.state.notice).toBe("Petición aceptada.");

  const html = render(h.state);

  expect(html).toContain("Petición aceptada.");
  expect(html).toContain('role="status"');
  expect(html).toContain("Publicada en la galería hasta el");
  expect(html).not.toMatch(/>(Aceptar|Rechazar)</);
});

it("CA-08 memory-decisions: Cancelar no llama a la API", async () => {
  const { h, review } = await opened();

  openDecision(h.ctx, "accept");
  closeDecision(h.ctx);

  expect(h.state.pendingAction).toBeNull();
  expect(review.accept).not.toHaveBeenCalled();
  expect(review.reject).not.toHaveBeenCalled();
  // Sin imagen o sin plazo, «Aceptar» tampoco llama a la API.
  h.ctx.dispatch({ type: "image-changed", image: { status: "not-found", url: "" } });
  expect(await acceptRequest(h.ctx, 11)).toBe(false);
  expect(review.accept).not.toHaveBeenCalled();
});

it("CA-10 memory-decisions: 422 de decisión tardía muestra el mensaje de la API y recarga", async () => {
  const { h, review } = await opened();

  review.accept.mockRejectedValueOnce(apiError(422, "Esta petición ya fue revisada."));
  review.get.mockResolvedValue(detail({ status: "rejected", rejection_reason: "Otra persona", rejected_fields: ["image"] }));
  openDecision(h.ctx, "accept");

  expect(await acceptRequest(h.ctx, 11)).toBe(false);
  expect(review.get).toHaveBeenCalledTimes(2);
  expect(h.state.data?.status).toBe("rejected");
  expect(h.state.pendingAction).toBeNull();
  expect(h.state.alert).toBe("Esta petición ya fue revisada.");
  expect(review.reject).not.toHaveBeenCalled();

  const html = render(h.state);

  expect(html).toContain('role="alert"');
  expect(html).toContain("Esta petición ya fue revisada.");
  expect(html).toContain("Esperando la corrección del visitante.");
});

it("CA-12 memory-decisions: Escape cierra sin llamar a la API", async () => {
  const { h, review } = await opened();

  // `Dialog` de @arca/ui convierte `cancel` (Escape) en `onClose`, que es `closeDecision`.
  expect(source("views/MemoryReviewDetailView.tsx")).toContain("onCancel={actions.closeDecision}");
  expect(source("components/MemoryRejectDialog.tsx")).toContain("onCancel={onCancel}");

  openDecision(h.ctx, "accept");
  closeDecision(h.ctx);
  fill(h, "Motivo", ["image"]);
  closeDecision(h.ctx);

  expect(h.state.pendingAction).toBeNull();
  expect(h.state.rejectReason).toBe("");
  expect(review.accept).not.toHaveBeenCalled();
  expect(review.reject).not.toHaveBeenCalled();
});

it("RN-04 memory-decisions: el texto del diálogo dice el plazo que devuelve la API y no lo calcula", async () => {
  for (const days of [1, 30]) {
    const { h } = await opened({ get: async () => detail({ publication_days: days }) });

    openDecision(h.ctx, "accept");

    expect(render(h.state)).toContain(days === 1 ? "durante 1 día desde la aceptación" : "durante 30 días desde la aceptación");
  }

  const text = source("viewmodels/memory-review-shared.ts");

  expect(text).not.toMatch(/Date\.now|new Date|getTime/);
  expect(text).not.toMatch(/\b7\b[^\n]*días/);
});

it("CA-09 memory-decisions: Confirmar deshabilitado sin motivo ni casillas; no llama a la API", async () => {
  const { h, review } = await opened();

  openDecision(h.ctx, "reject");

  const empty = render(h.state);

  expect(empty).toContain("Rechazar petición");
  expect(empty).toContain("Motivo");
  expect(empty).toContain("0/500");
  expect(empty).toContain("¿Qué falló?");
  expect(empty).toContain("La foto");
  expect(empty).toContain("La opinión");
  expect(empty).toMatch(/disabled=""[^>]*>Confirmar</);

  expect(await rejectRequest(h.ctx, 11)).toBe(false);

  h.ctx.dispatch({ type: "reject-reason-changed", reason: "Motivo" });
  expect(render(h.state)).toMatch(/disabled=""[^>]*>Confirmar</);
  expect(await rejectRequest(h.ctx, 11)).toBe(false);

  h.ctx.dispatch({ type: "reject-reason-changed", reason: "   " });
  h.ctx.dispatch({ type: "reject-field-toggled", field: "image" });
  expect(render(h.state)).toMatch(/disabled=""[^>]*>Confirmar</);
  expect(await rejectRequest(h.ctx, 11)).toBe(false);
  expect(review.reject).not.toHaveBeenCalled();

  h.ctx.dispatch({ type: "reject-reason-changed", reason: "Foto borrosa" });
  expect(render(h.state)).not.toMatch(/disabled=""[^>]*>Confirmar</);
  expect(render(h.state)).toContain("12/500");
});

it("CA-09 memory-decisions: motivo de 500 caracteres aceptado; 501 no", async () => {
  const { h, review } = await opened();

  fill(h, "a".repeat(501), ["content"]);
  expect(await rejectRequest(h.ctx, 11)).toBe(false);
  expect(review.reject).not.toHaveBeenCalled();

  h.ctx.dispatch({ type: "reject-reason-changed", reason: "a".repeat(500) });
  review.get.mockResolvedValue(detail({ status: "rejected", rejection_reason: "a".repeat(500), rejected_fields: ["content"] }));

  expect(await rejectRequest(h.ctx, 11)).toBe(true);
  expect(review.reject).toHaveBeenCalledWith(11, {
    rejection_reason: "a".repeat(500),
    rejected_fields: ["content"],
  });
  expect(h.state.notice).toBe("Petición rechazada. Esperando la corrección del visitante.");

  const html = render(h.state);

  expect(html).toContain("aaaa");
  expect(html).toContain("La opinión");
  expect(html).toContain("Esperando la corrección del visitante.");
});

it("CA-09 memory-decisions: 422 de rechazo junto al campo sin cerrar", async () => {
  const { h, review } = await opened();

  review.reject.mockRejectedValueOnce(
    apiError(422, "Datos inválidos.", {
      rejection_reason: ["El motivo no puede superar 500 caracteres."],
      rejected_fields: ["Marca al menos una opción."],
    }),
  );
  fill(h, "Motivo", ["image"]);

  expect(await rejectRequest(h.ctx, 11)).toBe(false);
  expect(h.state.pendingAction).toBe("reject");
  expect(h.state.dialogError).toBe("");

  const html = render(h.state);

  expect(html).toContain("El motivo no puede superar 500 caracteres.");
  expect(html).toContain("Marca al menos una opción.");
  expect(html).toContain('aria-invalid="true"');
  expect(html).toContain('aria-describedby="memory-reject-reason-error"');
  // La petición no se recargó ni cambió.
  expect(review.get).toHaveBeenCalledTimes(1);
});

it("CA-10 memory-decisions: 422 de estado recarga y cierra el diálogo", async () => {
  const { h, review } = await opened();

  review.reject.mockRejectedValueOnce(
    apiError(422, "Esta petición ya fue revisada.", { status: ["Esta petición ya fue revisada."] }),
  );
  review.get.mockResolvedValue(detail({ status: "accepted", is_published: true, published_until: "2026-11-19T10:00:00Z", published_at: "2026-11-12T10:00:00Z" }));
  fill(h, "Motivo", ["image", "content"]);

  expect(await rejectRequest(h.ctx, 11)).toBe(false);
  expect(review.get).toHaveBeenCalledTimes(2);
  expect(h.state.pendingAction).toBeNull();
  expect(h.state.data?.status).toBe("accepted");
  expect(h.state.alert).toBe("Esta petición ya fue revisada.");
  expect(h.state.fieldErrors).toEqual({});
});

it("RN-05 memory-decisions: rejected_fields solo image y content; al menos uno", async () => {
  const { h, review } = await opened();

  fill(h, "Motivo", ["content", "image", "content"]);
  // Marcar dos veces la misma casilla la desmarca; el orden es el de la API.
  expect(h.state.rejectFields).toEqual(["image"]);
  h.ctx.dispatch({ type: "reject-field-toggled", field: "content" });
  review.get.mockResolvedValue(detail({ status: "rejected", rejection_reason: "Motivo", rejected_fields: ["image", "content"] }));

  await rejectRequest(h.ctx, 11);

  expect(review.reject).toHaveBeenCalledWith(11, {
    rejection_reason: "Motivo",
    rejected_fields: ["image", "content"],
  });

  const empty = await opened();

  fill(empty.h, "Motivo", []);
  expect(await rejectRequest(empty.h.ctx, 11)).toBe(false);
  expect(empty.review.reject).not.toHaveBeenCalled();
});

it("CA-12 memory-decisions: Cancelar no llama a la API", async () => {
  const { h, review } = await opened();

  fill(h, "Motivo escrito", ["image"]);
  closeDecision(h.ctx);

  expect(h.state.pendingAction).toBeNull();
  expect(h.state.rejectFields).toEqual([]);
  expect(review.reject).not.toHaveBeenCalled();
  expect(review.accept).not.toHaveBeenCalled();
});
