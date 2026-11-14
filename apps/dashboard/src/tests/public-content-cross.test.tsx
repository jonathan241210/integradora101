import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { acceptRequest, openRequest, rejectRequest } from "../viewmodels/species-requests";
import { fakeApi, harness, requestDetail } from "./species-fixtures";
import { publishedStateWith, publishedViewModel, row } from "./species-published-fixtures";

/*
 * CA cruzados de dashboard-010 (plan, pregunta 7, decisión 2026-11-13): la verificación
 * de fondo vive en api-015, api-014 y web-011; aquí solo se prueba la parte de UI del
 * dashboard con respuestas simuladas. CA-42, CA-43 y CA-48 no tienen parte en el
 * dashboard (TulanPedia y almacenamiento son de web y API) y no se simulan aquí.
 */

const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");

const listWith = (items: ReturnType<typeof row>[]) =>
  renderToStaticMarkup(
    <PublishedSpeciesView
      {...publishedViewModel(
        publishedStateWith({
          list: { status: "ready", items, hasMore: false, error: "", forbidden: false },
          thumbs: Object.fromEntries(items.map((item) => [item.id, { status: "none" as const, url: "" }])),
        }),
      )}
      onOpenRequests={() => undefined}
    />,
  );

async function opened(detail = requestDetail()) {
  const fake = fakeApi();

  fake.requests.get.mockResolvedValue(detail);

  const h = harness(fake.api);

  await openRequest(h.ctx, detail.id);

  return { ...fake, h };
}

it("CA-40 public-content-cross: aceptar con publicación envía publish true, avisa que es visible en el catálogo y la lista la muestra Publicada", async () => {
  const { h, requests } = await opened();

  expect(await acceptRequest(h.ctx, true)).toBe(true);
  expect(requests.accept).toHaveBeenCalledWith(7, { publish: true });
  expect(h.state.notice).toBe("Especie publicada. Ya es visible en el catálogo público.");

  const html = listWith([row({ status: "published" })]);

  expect(html).toMatch(/<\/svg>Publicada<\/span>/);
  expect(html).not.toMatch(/<\/svg>Despublicada<\/span>/);
});

it("CA-41 public-content-cross: una especie despublicada con solicitud viva se muestra Despublicada; aceptar sin publicar y rechazar nunca envían publish true", async () => {
  const html = listWith([
    row({ status: "unpublished", unpublished_at: "2026-11-11T10:00:00Z", has_pending_request: true }),
  ]);

  expect(html).toMatch(/<\/svg>Despublicada<\/span>/);
  expect(html).toContain("Solicitud pendiente");
  expect(html).not.toMatch(/<\/svg>Publicada<\/span>/);

  const accepted = await opened(requestDetail({}, { publication_status: "unpublished" }));

  expect(await acceptRequest(accepted.h.ctx, false)).toBe(true);
  expect(accepted.requests.accept).toHaveBeenCalledWith(7, { publish: false });
  expect(accepted.h.state.notice).toBe("Cambios aceptados. La especie sigue despublicada.");

  const rejected = await opened();

  expect(await rejectRequest(rejected.h.ctx, "Datos incompletos")).toBe(true);
  expect(rejected.requests.accept).not.toHaveBeenCalled();
  expect(rejected.h.state.notice).toBe("Solicitud rechazada. La especie no se publicó.");
});

it("CA-45 public-content-cross: noticias y eventos (dashboard-007) no dependen de los módulos de especies", () => {
  const files = [
    "../sections/NewsSection.tsx",
    "../sections/EventsSection.tsx",
    "../components/ContentThumbnail.tsx",
    "../components/ContentCardActions.tsx",
    "../components/ImageUploadBox.tsx",
    "../viewmodels/useNewsManagement.ts",
    "../viewmodels/useEventsManagement.ts",
    "../viewmodels/image-field.ts",
  ];

  for (const path of files) {
    const text = read(path);

    expect(text, path).not.toMatch(/species|SpeciesPhoto|published-species/i);
  }
  // Y las pruebas de dashboard-007 siguen presentes (se ejecutan en el mismo `npm test`).
  expect(read("./content-image-display.test.tsx")).toContain("CA-");
});

it("CA-47 public-content-cross: dashboard-009 lleva las notas de integración y dashboard-008 no", () => {
  const spec009 = read("../../specs/009-species-request-review.md");
  const spec008 = read("../../specs/008-memory-moderation.md");

  expect(spec009).toContain("Integrada en dashboard-010");
  expect(spec009).toContain("Cambio de modelo");
  expect(spec009).toContain("apps/dashboard/specs/010-public-content-management.md");
  expect(spec008).not.toMatch(/Integrada en dashboard-010/);
});
