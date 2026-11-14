import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { closeDetail, loadImage, openDetail } from "../viewmodels/memory-review";
import { apiError, detail, detailHarness, fakeApi, imageFile } from "./memory-fixtures";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");

it("CA-17 memory-image: blob creado por el ViewModel; revocado al cerrar, al cambiar y al desmontar", async () => {
  const { api, review } = fakeApi();
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);

  expect(review.get).toHaveBeenCalledWith(11);
  expect(review.image).toHaveBeenCalledWith(11);
  expect(h.state.image).toEqual({ status: "ready", url: "blob:test/1" });
  expect(h.created).toEqual(["blob:test/1"]);

  // Cambiar de petición revoca la imagen anterior antes de pedir la nueva.
  review.get.mockResolvedValueOnce(detail({ id: 12 }));
  await openDetail(h.ctx, 12);

  expect(h.revoked).toEqual(["blob:test/1"]);
  expect(h.state.image.url).toBe("blob:test/2");

  // Cerrar el detalle (y desmontar, que usa la misma liberación) revoca la vigente.
  closeDetail(h.ctx);

  expect(h.revoked).toEqual(["blob:test/1", "blob:test/2"]);
  expect(h.state.image).toEqual({ status: "idle", url: "" });
  expect(h.state.data).toBeNull();

  // Una respuesta tardía no crea ninguna URL que quede sin revocar.
  const late = detailHarness(api);
  late.supersede();
  await loadImage(late.ctx, 11);

  expect(late.created).toEqual([]);
});

it("CA-17 memory-image: sin localStorage, sessionStorage, IndexedDB ni cookies; sin imagen en la URL", async () => {
  const { api } = fakeApi();
  const h = detailHarness(api);
  const touched: string[] = [];
  const guard = (name: string) =>
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        touched.push(name);
        throw new Error(`${name} no debe usarse`);
      },
    });
  const originals = ["localStorage", "sessionStorage", "indexedDB"].map((name) => ({
    name,
    descriptor: Object.getOwnPropertyDescriptor(globalThis, name),
  }));

  for (const { name } of originals) guard(name);

  try {
    await openDetail(h.ctx, 11);
  } finally {
    for (const { name, descriptor } of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }

  expect(touched).toEqual([]);

  for (const path of [
    "viewmodels/memory-review.ts",
    "viewmodels/memory-review-shared.ts",
    "viewmodels/useMemoryReviewDetail.ts",
    "viewmodels/useMemoryReviewList.ts",
    "sections/MemoriesSection.tsx",
    "sections/MemoryDetailSection.tsx",
    "components/MemoryImage.tsx",
  ]) {
    const text = source(path);

    expect(text, path).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/i);
    expect(text, path).not.toMatch(/location\.(?:hash|search|href)|history\.(?:push|replace)State/);
  }
});

it("CA-18 memory-detail: 404 de imagen deja el estado not-found y no abre la URL", async () => {
  const { api, review } = fakeApi();
  review.image.mockRejectedValueOnce(apiError(404, "No encontrada."));
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);

  expect(h.state.data?.id).toBe(11);
  expect(h.state.image).toEqual({ status: "not-found", url: "" });
  expect(h.created).toEqual([]);

  // Un tipo que no es imagen y un 5xx son error, nunca una URL.
  review.image.mockResolvedValueOnce(imageFile("text/html"));
  await loadImage(h.ctx, 11);

  expect(h.state.image.status).toBe("error");

  review.image.mockRejectedValueOnce(apiError(500, "Boom"));
  await loadImage(h.ctx, 11);

  expect(h.state.image.status).toBe("error");
  expect(h.created).toEqual([]);
});

it("RN-09 memory-image: la sección no construye rutas de /media", () => {
  for (const path of [
    "viewmodels/memory-review.ts",
    "viewmodels/memory-review-shared.ts",
    "viewmodels/useMemoryReviewDetail.ts",
    "views/MemoryReviewDetailView.tsx",
    "components/MemoryImage.tsx",
  ]) {
    const text = source(path);

    expect(text, path).not.toContain("/media");
    expect(text, path).not.toContain("image_url");
    expect(text, path).not.toMatch(/\/api\/v1/);
  }
});
