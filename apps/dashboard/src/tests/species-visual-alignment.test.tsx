import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportTabs } from "../components/ReportTabs";
import { SpeciesStatusBadge } from "../components/SpeciesStatusBadge";
import { TulanpediaTabs } from "../components/TulanpediaTabs";
import { tabForKey } from "../viewmodels/report-tabs";
import { tulanpediaTabs } from "../viewmodels/tulanpedia-tab";
import { PublishedSpeciesDetailView } from "../views/PublishedSpeciesDetailView";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { SpeciesRequestDetailView } from "../views/SpeciesRequestDetailView";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import { row, publication, publishedStateWith, publishedViewModel } from "./species-published-fixtures";
import { requestDetail, stateWith, summary, viewModelFor } from "./species-fixtures";

const source = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), "utf8");
const css = source("styles.css");
const block = (selector: string) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(?:^|\\n)${escaped} \\{([^}]*)\\}`));

  return match?.[1] ?? "";
};

const requestsList = (items = [summary()]) =>
  renderToStaticMarkup(
    <SpeciesRequestsView
      {...viewModelFor(
        stateWith({ list: { status: "ready", items, hasMore: false, lastPage: 1, total: 0, error: "", forbidden: false } }),
      )}
    />,
  );
const publishedList = (items = [row()]) =>
  renderToStaticMarkup(
    <PublishedSpeciesView
      {...publishedViewModel(
        publishedStateWith({
          list: { status: "ready", items, hasMore: false, lastPage: 1, total: 0, error: "", forbidden: false },
        }),
      )}
      onOpenRequests={() => undefined}
    />,
  );

describe("dashboard-010 revisión 2026-11-21: alineación al patrón de Reportes", () => {
  it("CA-66 tulanpedia-visual: un único encabezado fijo en la sección; las listas no lo repiten; el detalle conserva el nombre", () => {
    const section = source("sections/TulanpediaSection.tsx");

    expect(section).toMatch(/eyebrow="Administración"/);
    expect(section).toMatch(/title="Zoopedia"/);
    expect(section.indexOf("<SectionHeading")).toBeLessThan(section.indexOf("<TulanpediaTabs"));
    expect(requestsList()).not.toContain("<h1");
    expect(publishedList()).not.toContain("<h1");

    const requestDetailHtml = renderToStaticMarkup(
      <SpeciesRequestDetailView
        {...viewModelFor(
          stateWith({
            selectedId: 7,
            detail: { status: "ready", data: requestDetail(), error: "", forbidden: false },
          }),
        )}
      />,
    );
    const publishedDetailHtml = renderToStaticMarkup(
      <PublishedSpeciesDetailView
        {...publishedViewModel(
          publishedStateWith({
            selectedId: 3,
            detail: { status: "ready", data: publication(), error: "", forbidden: false },
          }),
        )}
      />,
    );

    expect(requestDetailHtml).toMatch(/<h1>Solicitud: León africano<\/h1>/);
    expect(publishedDetailHtml).toMatch(/<h1>Especie: León africano<\/h1>/);
  });

  it("CA-67 tulanpedia-visual: pestañas con clase neutral compartida con Reportes, teclado de Reportes y foco --ring de 3 px", () => {
    const tulanpedia = renderToStaticMarkup(
      <TulanpediaTabs active="requests" onSelect={() => undefined}>
        <p>x</p>
      </TulanpediaTabs>,
    );
    const reports = renderToStaticMarkup(
      <ReportTabs
        tabs={[{ id: "tickets", label: "Boletos", permission: "reports.view" }]}
        active="tickets"
        onSelect={() => undefined}
      >
        <p>x</p>
      </ReportTabs>,
    );

    for (const html of [tulanpedia, reports]) {
      expect(html).toContain('class="section-tabs');
      expect(html).toContain("section-tab ");
      expect(html).toContain("section-tab-panel");
      expect(html).toContain('tabindex="0"');
    }
    expect(css).not.toMatch(/tulanpedia-tabs__/);
    expect(source("components/ReportTabs.tsx")).not.toMatch(/tulanpedia-tabs__/);
    expect(source("components/TulanpediaTabs.tsx")).toContain("tabForKey");

    expect(tabForKey(tulanpediaTabs, "requests", "End")).toBe("published");
    expect(tabForKey(tulanpediaTabs, "published", "Home")).toBe("requests");
    expect(tabForKey(tulanpediaTabs, "requests", "ArrowRight")).toBe("published");
    expect(tabForKey(tulanpediaTabs, "requests", "ArrowLeft")).toBe("published");
    expect(tabForKey(tulanpediaTabs, "requests", "Enter")).toBeNull();

    expect(css).toMatch(/\.section-tab:focus-visible,\s*\.section-tab-panel:focus-visible \{[^}]*outline: 3px solid var\(--ring\)/);
    expect(block(".section-tabs")).toMatch(/margin-bottom: 16px/);
    expect(block(".section-tabs")).not.toMatch(/rem/);
  });

  it("CA-68 tulanpedia-visual: el panel de pestañas hereda el gap de .dashboard-content en cada ancho con una sola regla", () => {
    expect(css.match(/\.section-tab-panel \{/g)).toHaveLength(1);
    expect(block(".section-tab-panel")).toMatch(/gap: var\(--content-gap, 20px\)/);
    expect(css).not.toMatch(/#tulanpedia-panel/);

    const setters = css.match(/--content-gap: \d+px/g) ?? [];

    // Base y cada media query de .dashboard-content (claro y administración).
    expect(setters.length).toBeGreaterThanOrEqual(6);
    expect(css).toMatch(/\.dashboard-app--admin \.dashboard-content \{\s*--content-gap: 24px/);
    expect(css).toMatch(/\.dashboard-content \{\s*--content-gap: 20px/);
  });

  it("CA-69 tulanpedia-visual: los filtros van en form.filter-form--species, 2 columnas y 1 a 640 px", () => {
    for (const html of [requestsList(), publishedList()]) {
      expect(html).toMatch(/<form class="filter-form filter-form--species"/);
    }
    expect(block(".filter-form--species")).toMatch(/repeat\(2, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/@media \(max-width: 640px\) \{\s*\.filter-form--users,\s*\.filter-form--species,/);
  });

  it("CA-70 tulanpedia-visual: acciones en row-actions con aria-label por fila; el aviso pendiente va bajo el Badge; sin margin-left en species-tag", () => {
    const requests = requestsList([summary({ common_name: "Jaguar" })]);

    expect(requests).toContain('class="row-actions"');
    expect(requests).toContain('aria-label="Revisar solicitud de Jaguar"');
    expect(requestsList([summary({ common_name: "Jaguar", status: "rejected" })])).toContain(
      'aria-label="Ver solicitud de Jaguar"',
    );

    const published = publishedList([row({ common_name: "Jaguar", has_pending_request: true })]);
    const [statusCell, actionsCell] = published.split('class="row-actions"');

    expect(actionsCell).not.toContain("Esta especie tiene una solicitud pendiente");
    expect(actionsCell).not.toContain("Ver la solicitud");
    expect(statusCell.lastIndexOf("species-cell")).toBeLessThan(statusCell.lastIndexOf("species-detail__hint"));
    expect(statusCell).toContain("Ver la solicitud");
    expect(actionsCell).toContain('aria-label="Revisar especie Jaguar"');

    expect(block(".species-tag")).not.toMatch(/margin/);
    expect(block(".species-cell")).toMatch(/gap: 6px/);
  });

  it("CA-71 tulanpedia-visual: detalle y ficha en escala admin, facts en rejilla, acciones agrupadas con «Rechazar» aparte y Ficha pública en chips", () => {
    expect(block(".species-detail")).toMatch(/gap: 20px/);
    expect(block(".species-detail")).toMatch(/padding: 24px/);
    expect(css).toMatch(/\.species-compare h2,\s*\.species-detail h3,\s*\.species-form h3 \{[^}]*font-size: 17px/);
    expect(block(".species-compare > section")).toContain("var(--radius-card)");
    expect(block(".species-form")).toContain("var(--radius-card)");
    expect(block(".species-detail .species-form")).toMatch(/padding: 0/);
    expect(block(".species-detail .species-form")).toMatch(/border: 0/);
    expect(block(".species-form__fichas")).toMatch(/padding: 16px 20px/);
    expect(css).toMatch(/@media \(min-width: 821px\) \{[^@]*\.species-detail__facts \{\s*grid-template-columns: repeat\(3/);
    expect(css).toMatch(/@media \(max-width: 820px\) \{[^@]*\.species-detail__facts \{\s*grid-template-columns: repeat\(2/);
    expect(css).not.toMatch(/@media \(min-width: 768px\) \{\s*\.species-compare/);
    expect(block(".species-detail__ficha li")).toMatch(/border-radius: 999px/);

    const html = renderToStaticMarkup(
      <SpeciesRequestDetailView
        {...viewModelFor(
          stateWith({
            selectedId: 7,
            detail: { status: "ready", data: requestDetail(), error: "", forbidden: false },
          }),
        )}
      />,
    );

    expect(html).toContain("species-detail__actions-main");
    expect(html).toContain("species-detail__actions-danger");
    expect(html.indexOf("species-detail__actions-main")).toBeLessThan(
      html.indexOf("species-detail__actions-danger"),
    );
    expect(html).toMatch(/species-detail__actions-danger[^>]*><button[^>]*>Rechazar</);
    expect(html).toMatch(/species-detail__ficha[\s\S]*<ul>/);
  });

  it("CA-72 tulanpedia-visual: «Despublicada» usa tono advertencia, con icono y texto", () => {
    const html = renderToStaticMarkup(<SpeciesStatusBadge status="unpublished" />);

    expect(html).toContain("arca-badge--warning");
    expect(html).toContain("Despublicada");
    expect(html).toContain("<svg");
    expect(renderToStaticMarkup(<SpeciesStatusBadge status="published" />)).toContain("arca-badge--success");
  });

  it("CA-73 tulanpedia-visual: sin definiciones duplicadas de enclosure-grid, report-metric-grid, table-card ni inline-confirm; breakpoints de species en 820 y 640", () => {
    expect(css.match(/\.dashboard-app--admin \.enclosure-grid \{/g)).toHaveLength(3);
    expect(css).not.toMatch(/@media \(max-width: 1100px\) \{[^@]*\.dashboard-app--admin \.enclosure-grid/);
    expect(css.match(/\.dashboard-app--admin \.enclosure-grid \{\s*grid-template-columns: repeat\(3/g)).toHaveLength(1);
    expect(css.match(/(?:^|\n)\.report-metric-grid \{/g)).toHaveLength(1);
    expect(css.match(/(?:^|\n)\.table-card \{/g)).toHaveLength(1);
    expect(css).not.toMatch(/\.inline-confirm/);

    const species = css.slice(css.indexOf(".species-cell {"), css.indexOf("dashboard-008: moderación"));
    const widths = [...species.matchAll(/@media \((?:max|min)-width: (\d+)px\)/g)].map((m) => m[1]);

    expect(new Set(widths)).toEqual(new Set(["821", "820", "640"]));
  });
});
