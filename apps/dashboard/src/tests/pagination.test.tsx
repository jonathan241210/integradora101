import { readFileSync, readdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pagination, buildPagination, pageItems } from "@arca/ui";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const readUi = (path: string) =>
  readFileSync(new URL(`../../../../packages/ui/src/${path}`, import.meta.url), "utf8");
const noop = () => undefined;
const views = readdirSync(new URL("../views/", import.meta.url)).filter((f) => f.endsWith(".tsx"));

describe("CA-43 unified-reports-and-feedback", () => {
  it("existe un único paginador y ninguna vista conserva uno propio", () => {
    // dashboard-020 rev. (d): el paginador único vive en @arca/ui, no en el dashboard.
    const components = readdirSync(new URL("../components/", import.meta.url));
    expect(readUi("index.tsx")).toContain("export function Pagination(");
    expect(components).not.toContain("Pagination.tsx");
    expect(components).not.toContain("PaginationBar.tsx");
    expect(components).not.toContain("HasMorePaginationBar.tsx");
    for (const file of views) {
      const code = read(`views/${file}`);
      expect(code, file).not.toMatch(/PaginationBar|<nav[^>]*Paginaci|pagination-bar/);
    }
    for (const file of ["UsersView", "NewsView", "EventsView", "EnclosuresView", "TicketHistoryView", "TicketReportView", "MemoriesView", "SpeciesRequestsView", "PublishedSpeciesView"]) {
      expect(read(`views/${file}.tsx`), file).toMatch(/import \{[^}]*\bPagination\b[^}]*\} from "@arca\/ui"/);
    }
    expect(readUi("pagination.ts")).not.toMatch(/from "react"/);
  });
});

describe("CA-44 unified-reports-and-feedback", () => {
  it("con total muestra resumen, anterior, números y siguiente", () => {
    const html = renderToStaticMarkup(<Pagination page={2} lastPage={4} total={31} onPageChange={noop} />);
    expect(html).toContain("Página 2 de 4 · 31 en total");
    expect(html).toContain("Anterior");
    expect(html).toContain("Siguiente");
    expect(html).toContain('aria-label="Ir a la página 3"');
    expect(html).toContain('aria-current="page"');
  });
  it("abrevia con «…» cuando hay más de 7 páginas", () => {
    expect(pageItems(1, 7).filter((i) => i.type === "page")).toHaveLength(7);
    const items = pageItems(10, 20);
    expect(items.filter((i) => i.type === "gap")).toHaveLength(2);
    expect(items.filter((i) => i.type === "page").map((i) => i.type === "page" && i.number)).toEqual([1, 9, 10, 11, 20]);
  });
});

describe("CA-45 unified-reports-and-feedback", () => {
  it("con has_more muestra «Página N» sin números", () => {
    const html = renderToStaticMarkup(<Pagination page={3} hasMore onPageChange={noop} />);
    expect(html).toContain("Página 3");
    expect(html).not.toContain("en total");
    expect(html).not.toContain("Ir a la página");
    expect(buildPagination({ page: 1, hasMore: false }).nextDisabled).toBe(true);
    expect(buildPagination({ page: 1, hasMore: true }).nextDisabled).toBe(false);
  });
});

describe("CA-46 unified-reports-and-feedback", () => {
  it("es un nav accesible con extremos deshabilitados y foco con --ring", () => {
    const first = renderToStaticMarkup(<Pagination page={1} lastPage={1} total={0} onPageChange={noop} />);
    expect(first).toContain('<nav class="pagination-bar" aria-label="Paginación"');
    expect(first.match(/disabled=""/g)?.length).toBe(2);
    const busy = buildPagination({ page: 2, lastPage: 3, total: 9, busy: true });
    expect(busy.previousDisabled && busy.nextDisabled).toBe(true);
    const css = readUi("styles.css");
    expect(css).toMatch(/\.pagination-bar \.arca-button:focus-visible\s*{[^}]*var\(--ring\)/);
    expect(readUi("index.tsx")).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});

describe("CA-47 unified-reports-and-feedback", () => {
  it("las pantallas conservan tamaño de página y reinicio al filtrar", () => {
    expect(read("viewmodels/enclosures-management.ts")).toContain("ENCLOSURES_PAGE_SIZE = 9");
    expect(read("viewmodels/useEventsPagination.ts")).toContain("const pageSize = 4");
    expect(read("views/NewsView.tsx")).toContain("useContentPagination(state.items, pendingAction, state.actionBusy, 6, focus)");
    expect(read("views/UsersView.tsx")).toContain("actions.changeQuery({ page })");
    expect(read("views/TicketHistoryView.tsx")).toContain("onPageChange={actions.goToPage}");
  });
});

describe("CA-48 unified-reports-and-feedback", () => {
  it("no queda CSS de paginadores viejos sin uso (Cancelaciones ya pagina: rev. (d), CA-53)", () => {
    const css = `${read("styles.css")}\n${readUi("styles.css")}`;
    const classes = [...css.matchAll(/\.(pagination[\w-]*)/g)].map((m) => m[1]);
    const code = [...views.map((f) => read(`views/${f}`)), readUi("index.tsx")].join("\n");
    for (const name of new Set(classes)) {
      expect(code.includes(name) || name === "pagination-bar__summary", name).toBe(true);
    }
  });
});
