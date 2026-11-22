import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FUN_FACT_HELP,
  buildSheetUpdate,
  draftFromSheet,
  fichaFieldOptions,
  validateFunFact,
} from "../viewmodels/species-publication-shared";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { SpeciesRequestDetailView } from "../views/SpeciesRequestDetailView";
import { openRequest, startRequestEdit } from "../viewmodels/species-requests";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import { fakeApi, harness, requestDetail, stateWith, viewModelFor } from "./species-fixtures";
import { publication, publishedStateWith, publishedViewModel, row } from "./species-published-fixtures";
import type { SpeciesRequestUpdateInput, SpeciesFichaField } from "@arca/api-client";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const css = source("styles.css");
const apiTypes = readFileSync(
  fileURLToPath(new URL("../../../../packages/api-client/admin-types.ts", import.meta.url)),
  "utf8",
);

const FACT = "Duerme hasta veinte horas al día cuando hace calor.";

const list = (
  items = [row()],
  thumbs: Record<number, { status: "ready" | "none" | "loading" | "error"; url: string }> = {},
  status: "ready" | "empty" | "loading" | "error" = "ready",
) =>
  renderToStaticMarkup(
    <PublishedSpeciesView
      {...publishedViewModel(
        publishedStateWith({
          list: { status, items, hasMore: false, lastPage: 1, total: 0, error: "Falló", forbidden: false },
          thumbs,
        }),
      )}
      onOpenRequests={() => undefined}
    />,
  );

describe("dashboard-010 revisión 2026-11-21 (b): tarjetas y Dato curioso", () => {
  it("CA-74 species-fun-fact: el detalle de la solicitud y el de la especie muestran el dato curioso como texto", () => {
    const requestHtml = renderToStaticMarkup(
      <SpeciesRequestDetailView
        {...viewModelFor(
          stateWith({
            selectedId: 7,
            detail: {
              status: "ready",
              data: requestDetail(
                { published_fields: ["fun_fact"] },
                { fun_fact: "Dato actual de la especie." },
                { fun_fact: "<b>Propuesto</b> con marcado." },
              ),
              error: "",
              forbidden: false,
            },
          } as never),
        )}
      />,
    );

    expect(requestHtml).toContain("Dato curioso");
    expect(requestHtml).toContain("Dato actual de la especie.");
    expect(requestHtml).toContain("&lt;b&gt;Propuesto&lt;/b&gt; con marcado.");
    expect(requestHtml).not.toContain("<b>Propuesto</b>");

    const detail = (data: ReturnType<typeof publication>) =>
      renderToStaticMarkup(
        <PublishedSpeciesDetailView
          {...publishedViewModel(
            publishedStateWith({
              selectedId: data.id,
              detail: { status: "ready", data, error: "", forbidden: false },
            } as never),
          )}
        />,
      );
    const withFact = detail(
      publication({ fun_fact: FACT, published_fields: ["scientific_name", "fun_fact"] }),
    );

    expect(withFact).toContain("Dato curioso");
    expect(withFact).toContain(FACT);
    expect(detail(publication())).not.toContain("Dato curioso");
    expect(renderToStaticMarkup(<SpeciesRequestDetailView {...viewModelFor(stateWith({
      selectedId: 7,
      detail: { status: "ready", data: requestDetail(), error: "", forbidden: false },
    } as never))} />)).not.toContain("Dato curioso");
  });

  it("CA-75 species-cards: tarjetas con foto o marcador, nombres, estado, tipo, fecha, aviso en franja y acciones con aria-label", () => {
    const html = list(
      [
        row({ id: 3, common_name: "Jaguar", has_pending_request: true }),
        row({ id: 4, common_name: "Cebra", has_image: false, status: "unpublished", scientific_name: null }),
      ],
      { 3: { status: "ready", url: "blob:test/3" }, 4: { status: "none", url: "" } },
    );

    expect(html).toContain('class="species-grid"');
    expect(html).not.toContain("<table");
    expect((html.match(/class="species-card"/g) ?? []).length).toBe(2);
    expect(html).toMatch(/<img class="species-card__image" src="blob:test\/3"/);
    expect(html).toContain("species-card__placeholder");
    expect(html).toContain("Sin foto");
    expect(html).toContain('<h3 class="species-card__title">Jaguar</h3>');
    expect(html).toContain('<p class="species-card__scientific">Panthera leo</p>');
    expect(html).toContain("Publicada");
    expect(html).toContain("Despublicada");
    expect(html).toContain("Solicitud pendiente");
    expect(html).toContain("Tipo de animal");
    expect(html).toContain("Mamífero");
    expect(html).toContain("Publicada el");
    expect(html).toContain('aria-label="Revisar especie Jaguar"');
    expect(html).toContain('aria-label="Editar especie Jaguar"');
    expect(html).toContain('aria-label="Republicar especie Jaguar"');
    expect(html).toContain('aria-label="Revisar especie Cebra"');
    expect(html).not.toContain('aria-label="Editar especie Cebra"');
    expect(html).toContain("filter-form--species");
    expect(html).toMatch(/Siguiente<\/button>/);

    const [, notice] = html.split("species-card__notice");

    expect(notice.indexOf("Esta especie tiene una solicitud pendiente")).toBeGreaterThan(-1);
    expect(notice.indexOf("species-card__footer")).toBeGreaterThan(
      notice.indexOf("Esta especie tiene una solicitud pendiente"),
    );
    // Sin resumen de conteos: la API solo entrega `has_more`.
    expect(html).not.toMatch(/\d+ especies?\s·/);
  });

  it("CA-76 species-cards: vacío con icono y texto, carga y error con reintento; rejilla 3/2/1 con tokens y foco --ring", () => {
    const empty = list([], {}, "empty");

    expect(empty).toContain("species-empty");
    expect(empty).toContain("<svg");
    expect(empty).toContain("No hay especies con este estado.");
    expect(list([], {}, "loading")).toContain("Cargando especies…");
    const error = list([], {}, "error");

    expect(error).toContain("Falló");
    expect(error).toContain("Reintentar");

    expect(css).toMatch(/\.species-grid \{[^}]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 1100px\) \{\s*\.species-grid \{\s*grid-template-columns: repeat\(2/);
    expect(css).toMatch(/@media \(max-width: 640px\) \{\s*\.species-grid \{\s*grid-template-columns: minmax\(0, 1fr\)/);
    const card = css.match(/\n\.species-card \{([^}]*)\}/)?.[1] ?? "";

    expect(card).toContain("var(--radius-card)");
    expect(card).toContain("var(--shadow-card)");
    expect(css).toMatch(/\.species-card:focus-within \{[^}]*3px solid var\(--ring\)/);
    expect(css).toMatch(/\.species-card__image \{[^}]*object-fit: cover/);
    expect(css).toMatch(/\.species-card__media \{[^}]*aspect-ratio/);
    const added = css.slice(css.indexOf("«Publicadas» en tarjetas"));

    expect(added).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("CA-77 species-fun-fact: chip «Dato curioso», textarea de 4 filas, contador sobre 500 y ayuda", async () => {
    expect(fichaFieldOptions.map((option) => option.label)).toContain("Dato curioso");

    const fake = fakeApi();
    const h = harness(fake.api);

    await openRequest(h.ctx, 7);
    startRequestEdit(h.ctx);
    h.ctx.dispatch({ type: "draft-changed", changes: { fun_fact: "Texto de prueba" } });
    const html = renderToStaticMarkup(<SpeciesRequestsView {...viewModelFor(h.state)} />);

    expect(html).toContain("Dato curioso");
    expect(html).toMatch(/<textarea[^>]*rows="4"/);
    expect(html).toContain("15/500");
    expect(html).toContain(FUN_FACT_HELP);
    expect(FUN_FACT_HELP).toBe(
      "Escribe una o dos frases para quien visita el zoológico. No incluyas datos clínicos ni de personas.",
    );
  });

  it("CA-78 species-fun-fact: obligatorio con mínimo de 20 solo si está marcado; máximo 500; si se desmarca no se envía", () => {
    expect(validateFunFact("corto", true).error).toBe("Dato curioso: escribe al menos 20 caracteres.");
    expect(validateFunFact("   ", true).error).not.toBe("");
    expect(validateFunFact("corto", false).error).toBe("");
    expect(validateFunFact("a".repeat(20), true).error).toBe("");
    expect(validateFunFact("a".repeat(500), true).error).toBe("");
    expect(validateFunFact("a".repeat(501), false).error).toBe("Dato curioso: máximo 500 caracteres.");

    const base = draftFromSheet({
      scientific_name: "Panthera leo",
      habitat: "Sabana",
      origin: "África",
      fun_fact: null,
      category: "mammal",
      published_fields: ["origin"],
    });
    const selected: SpeciesFichaField[] = ["origin", "fun_fact"];

    const invalid = buildSheetUpdate(base, { ...base, published_fields: selected, fun_fact: "corto" }, null);

    expect(invalid.input).toBeNull();
    expect(invalid.fieldErrors.fun_fact).toEqual(["Dato curioso: escribe al menos 20 caracteres."]);

    const ok = buildSheetUpdate(base, { ...base, published_fields: selected, fun_fact: `  ${FACT}  ` }, null);

    expect((ok.input as SpeciesRequestUpdateInput).fun_fact).toBe(FACT);
    expect((ok.input as SpeciesRequestUpdateInput).published_fields).toEqual(selected);

    // Desmarcado: el texto escrito no viaja ni se valida.
    const off = buildSheetUpdate(base, { ...base, fun_fact: "corto" }, null);

    expect(off.fieldErrors.fun_fact).toBeUndefined();
    expect(off.input).not.toHaveProperty("fun_fact");

    // Con el campo ya marcado y sin cambios, no se reenvía.
    const marked = draftFromSheet({
      scientific_name: "Panthera leo",
      habitat: "Sabana",
      origin: "África",
      fun_fact: FACT,
      category: "mammal",
      published_fields: ["fun_fact"],
    });

    expect(buildSheetUpdate(marked, { ...marked }, null).input).not.toHaveProperty("fun_fact");
  });

  it("CA-79 species-fun-fact: tipos aditivos de api-client con fun_fact opcional", () => {
    expect(apiTypes).toMatch(/SpeciesFichaField =[^;]*"fun_fact"/);
    expect((apiTypes.match(/fun_fact\?: string \| null;/g) ?? []).length).toBe(3);
    expect(apiTypes).toMatch(/fun_fact\?: string;/);
    expect(apiTypes).not.toMatch(/fun_fact: string/);
  });
});
