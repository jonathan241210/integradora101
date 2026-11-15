import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemoriesView } from "../views/MemoriesView";
import { MemoryReviewDetailView } from "../views/MemoryReviewDetailView";
import {
  acceptRequest,
  loadList,
  openDecision,
  openDetail,
  rejectRequest,
  type MemoryDetailState,
  type MemoryListState,
} from "../viewmodels/memory-review";
import {
  apiError,
  detail,
  detailHarness,
  detailViewModel,
  fakeApi,
  listHarness,
  listStateWith,
  listViewModel,
  summary,
} from "./memory-fixtures";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const renderDetail = (state: MemoryDetailState) =>
  renderToStaticMarkup(<MemoryReviewDetailView {...detailViewModel(state)} onBack={() => undefined} />);
const renderList = (state: MemoryListState) =>
  renderToStaticMarkup(<MemoriesView {...listViewModel(state)} onOpen={() => undefined} />);

it("CA-11 memory-errors: 401 sin mensaje propio; el manejador global lo atiende", async () => {
  const { api, review } = fakeApi();
  review.list.mockRejectedValueOnce(apiError(401, "No autenticado."));
  review.get.mockRejectedValueOnce(apiError(401, "No autenticado."));

  const list = listHarness(api, listStateWith({ status: "ready", items: [summary()] }));

  await loadList(list.ctx, { filter: "", page: 1 });

  // Sin `list-failed`: el ViewModel no escribe ningún mensaje del 401.
  expect(list.actions.map((action) => action.type)).toEqual(["list-loading"]);
  expect(renderList(list.state)).not.toContain("No autenticado.");

  const h = detailHarness(api);

  await openDetail(h.ctx, 11);

  expect(h.actions.map((action) => action.type)).toEqual(["detail-opening"]);
  expect(source("viewmodels/memory-review.ts")).not.toContain("Tu sesión expiró");
});

it("CA-11 memory-errors: 403 muestra el aviso de denegado en lista y detalle", async () => {
  const { api, review } = fakeApi();
  review.list.mockRejectedValueOnce(apiError(403, "Prohibido."));
  review.get.mockRejectedValueOnce(apiError(403, "Prohibido."));

  const list = listHarness(api);

  await loadList(list.ctx, { filter: "", page: 1 });

  expect(renderList(list.state)).toContain("No tienes permiso para revisar momentos.");
  expect(renderList(list.state)).not.toContain("Reintentar");

  const h = detailHarness(api);

  await openDetail(h.ctx, 11);

  const html = renderDetail(h.state);

  expect(html).toContain("No tienes permiso para revisar momentos.");
  expect(html).not.toContain("Reintentar");
  expect(review.image).not.toHaveBeenCalled();
});

it("CA-11 memory-errors: 404 de detalle muestra «Petición no encontrada.»", async () => {
  const { api, review } = fakeApi();
  review.get.mockRejectedValueOnce(apiError(404, "No query results"));
  const h = detailHarness(api);

  await openDetail(h.ctx, 99);

  const html = renderDetail(h.state);

  expect(html).toContain("Petición no encontrada.");
  expect(html).toContain("Volver a la lista");
  expect(html).not.toContain("Reintentar");
  expect(html).not.toContain("No query results");
});

it("CA-11 memory-errors: 422 por campo y 5xx o red con Reintentar; sin datos anteriores", async () => {
  const { api, review } = fakeApi();
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);
  expect(renderDetail(h.state)).toContain("Mi primer viaje");

  // 5xx al recargar: el detalle anterior ya no se muestra como actual.
  review.get.mockRejectedValueOnce(apiError(500, "Error interno"));
  await openDetail(h.ctx, 11);

  const failed = renderDetail(h.state);

  expect(failed).toContain("No se pudo cargar la petición.");
  expect(failed).toContain("Reintentar");
  expect(failed).not.toContain("Mi primer viaje");

  // Red: mismo tratamiento.
  review.get.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await openDetail(h.ctx, 11);
  expect(renderDetail(h.state)).toContain("Reintentar");

  // Lista con 5xx: sin filas anteriores y con Reintentar.
  review.list.mockRejectedValueOnce(apiError(503, "x"));
  const list = listHarness(api, listStateWith({ status: "ready", items: [summary({ opinion: "Fila vieja" })] }));
  await loadList(list.ctx, { filter: "", page: 1 });

  expect(renderList(list.state)).toContain("Reintentar");
  expect(renderList(list.state)).not.toContain("Fila vieja");

  // 422 por campo del rechazo y 422 de imagen al aceptar quedan en el diálogo.
  const ok = detailHarness(api);

  await openDetail(ok.ctx, 11);
  openDecision(ok.ctx, "reject");
  ok.ctx.dispatch({ type: "reject-reason-changed", reason: "Motivo" });
  ok.ctx.dispatch({ type: "reject-field-toggled", field: "image" });
  review.reject.mockRejectedValueOnce(apiError(422, "Inválido.", { rejection_reason: ["Motivo no válido."] }));
  await rejectRequest(ok.ctx, 11);

  expect(renderDetail(ok.state)).toContain("Motivo no válido.");

  openDecision(ok.ctx, "accept");
  review.accept.mockRejectedValueOnce(
    apiError(422, "x", { image: ["La imagen no está disponible; no se puede aceptar."] }),
  );
  await acceptRequest(ok.ctx, 11);

  expect(ok.state.pendingAction).toBe("accept");
  expect(ok.state.dialogError).toBe("La imagen no está disponible; no se puede aceptar.");

  // Error de red al decidir: el diálogo sigue abierto con el mensaje.
  review.accept.mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await acceptRequest(ok.ctx, 11);
  expect(ok.state.dialogError).toContain("No fue posible conectar con el servidor");
});

it("CA-10 memory-errors: 422 de estado recarga el detalle con el estado actual", async () => {
  const { api, review } = fakeApi();
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);
  openDecision(h.ctx, "accept");
  review.accept.mockRejectedValueOnce(
    apiError(422, "Esta petición está rechazada y espera la corrección del visitante."),
  );
  review.get.mockResolvedValue(detail({ status: "rejected", rejection_reason: "Ya rechazada", rejected_fields: ["content"] }));

  await acceptRequest(h.ctx, 11);

  expect(h.state.data?.status).toBe("rejected");
  expect(h.state.alert).toBe("Esta petición está rechazada y espera la corrección del visitante.");
  expect(renderDetail(h.state)).toContain("Ya rechazada");
});

it("RN-01 memory-errors: ninguna respuesta de error decide permisos en la UI", () => {
  for (const path of ["viewmodels/memory-review.ts", "viewmodels/memory-review-shared.ts"]) {
    const text = source(path);

    expect(text, path).not.toMatch(/permissions|memories\.review|hasPermission|roles/);
  }

  // El 403 solo cambia el aviso; la sección sigue siendo la que decidió la navegación.
  expect(source("views/MemoriesView.tsx")).not.toMatch(/permissions|memories\.review/);
  expect(source("views/MemoryReviewDetailView.tsx")).not.toMatch(/permissions|memories\.review/);
});
