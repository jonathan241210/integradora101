import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MemoriesView } from "../views/MemoriesView";
import { MemoryReviewDetailView } from "../views/MemoryReviewDetailView";
import { openDecision, openDetail } from "../viewmodels/memory-review";
import { detailHarness, detailViewModel, fakeApi, listStateWith, listViewModel, summary } from "./memory-fixtures";

async function dialogHtml(decision: "accept" | "reject") {
  const { api } = fakeApi();
  const h = detailHarness(api);

  await openDetail(h.ctx, 11);
  openDecision(h.ctx, decision);

  return renderToStaticMarkup(
    <MemoryReviewDetailView {...detailViewModel(h.state)} onBack={() => undefined} />,
  );
}

it("CA-12 memory-a11y: diálogos de aceptar y rechazar con role dialog y nombre accesible", async () => {
  for (const decision of ["accept", "reject"] as const) {
    const html = await dialogHtml(decision);
    // `<dialog>` modal tiene rol dialog implícito; el nombre sale de su título.
    const labelled = [...html.matchAll(/<dialog[^>]*aria-labelledby="([^"]+)"[^>]*>\s*<h2[^>]*id="\1"[^>]*>([^<]+)</g)];
    const names = labelled.map((match) => match[2]);

    expect(names, decision).toContain(decision === "accept" ? "¿Aceptar esta petición?" : "Rechazar petición");
  }
});

it("CA-12 memory-a11y: el motivo tiene label y el contador se lee como texto", async () => {
  const html = await dialogHtml("reject");

  expect(html).toMatch(/<label[^>]*for="memory-reject-reason"[^>]*>Motivo<\/label>/);
  expect(html).toMatch(/<textarea[^>]*id="memory-reject-reason"/);
  expect(html).toMatch(/<span class="field-counter">0\/500<\/span>/);
  expect(html).toMatch(/<fieldset[\s\S]*?<legend>¿Qué falló\?<\/legend>/);
  expect(html).toMatch(/<label class="memory-review__check"><input type="checkbox"[^>]*\/>La foto<\/label>/);
  expect(html).toMatch(/<label class="memory-review__check"><input type="checkbox"[^>]*\/>La opinión<\/label>/);
});

it("CA-13 memory-a11y: controles con etiqueta y botones con texto visible o aria-label", () => {
  const list = renderToStaticMarkup(
    <MemoriesView
      {...listViewModel(listStateWith({ status: "ready", items: [summary()], hasMore: true }))}
      onOpen={() => undefined}
    />,
  );

  expect(list).toMatch(/<label[^>]*for="memory-review-filter"[^>]*>Estado<\/label>/);
  expect(list).toMatch(/<nav[^>]*aria-label="Paginación"/);
  expect(list).toMatch(/<div[^>]*role="region"[^>]*aria-label="Peticiones de visitantes"[^>]*tabindex="0"/);

  for (const button of list.matchAll(/<button([^>]*)>([\s\S]*?)<\/button>/g)) {
    const visible = button[2].replace(/<[^>]+>/g, "").trim();

    expect(visible || /aria-label="[^"]+"/.test(button[1]), button[0]).toBeTruthy();
  }
});
