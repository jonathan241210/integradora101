import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as ui from "@arca/ui";
import { createAdminApi, createHttpClient } from "@arca/api-client";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { MemoriesView } from "../views/MemoriesView";
import { PublishedSpeciesView } from "../views/PublishedSpeciesView";
import { SpeciesRequestsView } from "../views/SpeciesRequestsView";
import { buildCancellationQuery, cancellationReportReducer, emptyCancellationFilters, initialCancellationReportState } from "../viewmodels/cancellation-report";
import { loadList, memoryListReducer } from "../viewmodels/memory-review";
import { cancellationReport } from "./admin-fixtures";
import { readyReportState, renderReport } from "./cancellation-report-helpers";
import { fakeApi as memoryApi, listHarness, listStateWith, listViewModel, summary as memorySummary } from "./memory-fixtures";
import { publishedStateWith, publishedViewModel, row } from "./species-published-fixtures";
import { stateWith, summary, viewModelFor } from "./species-fixtures";

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, "utf8");

const total = { current_page: 2, last_page: 3, per_page: 10, total: 25 };

describe("CA-49 unified-reports-and-feedback", () => {
  it("@arca/ui exporta la paginación, el contador de bloqueo y el diálogo de confirmación", () => {
    for (const name of [
      "Pagination",
      "buildPagination",
      "pageItems",
      "formatCountdown",
      "startCountdown",
      "useCountdown",
      "LockoutNotice",
      "ConfirmDialog",
    ]) {
      expect(typeof (ui as Record<string, unknown>)[name], name).toBe("function");
    }
  });

  it("la lógica pura del paquete no importa React y el README documenta los componentes", () => {
    expect(read("packages/ui/src/pagination.ts")).not.toMatch(/from "react"/);
    expect(read("packages/ui/src/countdown.ts")).not.toMatch(/from "react"/);
    const readme = read("packages/ui/README.md");
    for (const name of ["Pagination", "LockoutNotice", "useCountdown", "ConfirmDialog"]) {
      expect(readme, name).toContain(name);
    }
  });

  it("el paquete no usa colores de marca fijos en los componentes movidos", () => {
    const css = read("packages/ui/src/styles.css");
    for (const block of css.match(/\.(pagination-bar|arca-confirm-dialog|arca-visually-hidden)[^{]*{[^}]*}/g) ?? []) {
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    }
  });
});

describe("CA-50 unified-reports-and-feedback", () => {
  const copy = { title: "Eliminar noticia", message: "¿Seguro?", confirmLabel: "Eliminar", danger: true };

  it("ConfirmDialog de @arca/ui es genérico: sin ActionError ni avisos propios del dashboard", () => {
    const source = read("packages/ui/src/index.tsx");
    expect(source).not.toMatch(/ActionError|DashboardNotifications|@\/viewmodels/);
    const html = renderToStaticMarkup(
      <ui.ConfirmDialog copy={copy} idleTitle="x" busy={false} onConfirm={() => undefined} onCancel={() => undefined} />,
    );
    expect(html).toContain("Eliminar noticia");
    expect(html).toContain("arca-confirm-dialog__actions");
    expect(html).toContain("Cancelar");
  });

  it("el dashboard conserva un envoltorio delgado que aporta ActionError y el ancho propio", () => {
    const wrapper = read("apps/dashboard/src/components/ConfirmDialog.tsx");
    expect(wrapper).toContain('import { ConfirmDialog as SharedConfirmDialog } from "@arca/ui"');
    expect(wrapper).toContain("<ActionError message={error} inDialog />");
    expect(wrapper).not.toContain("<Dialog");
    const html = renderToStaticMarkup(
      <ConfirmDialog copy={copy} idleTitle="x" busy error="Falló" onConfirm={() => undefined} onCancel={() => undefined} />,
    );
    expect(html).toContain("confirm-dialog");
    expect(html).toContain("Procesando…");
    expect(html).toContain("Falló");
  });
});

describe("CA-51 unified-reports-and-feedback", () => {
  it("TulanPedia (Solicitudes y Publicadas) pagina con total y números de página", () => {
    const requests = renderToStaticMarkup(
      <SpeciesRequestsView
        {...viewModelFor(
          stateWith({
            page: 2,
            list: { status: "ready", items: [summary()], hasMore: true, lastPage: 3, total: 25, error: "", forbidden: false },
          }),
        )}
      />,
    );
    const published = renderToStaticMarkup(
      <PublishedSpeciesView
        {...publishedViewModel(
          publishedStateWith({
            page: 2,
            list: { status: "ready", items: [row()], hasMore: true, lastPage: 3, total: 25, error: "", forbidden: false },
          }),
        )}
      />,
    );
    for (const html of [requests, published]) {
      expect(html).toContain("Página 2 de 3 · 25 en total");
      expect(html).toContain('aria-label="Ir a la página 3"');
      expect(html).toContain('aria-current="page"');
    }
    for (const file of ["SpeciesRequestsView", "PublishedSpeciesView"]) {
      expect(read(`apps/dashboard/src/views/${file}.tsx`)).not.toMatch(/hasMore=\{/);
    }
  });
});

describe("CA-52 unified-reports-and-feedback", () => {
  it("Momentos pagina con total y ya no lee meta.page ni meta.limit", async () => {
    const { api, review } = memoryApi();
    review.list.mockResolvedValueOnce({ data: [memorySummary()], meta: { ...total, has_more: true } });
    const h = listHarness(api);

    await loadList(h.ctx, { filter: "", page: 2 });

    expect(h.state.lastPage).toBe(3);
    expect(h.state.total).toBe(25);
    const html = renderToStaticMarkup(
      <MemoriesView {...listViewModel(listStateWith({ page: 2, status: "ready", items: [memorySummary()], hasMore: true, lastPage: 3, total: 25 }))} onOpen={() => undefined} />,
    );
    expect(html).toContain("Página 2 de 3 · 25 en total");
    expect(html).toContain('aria-label="Ir a la página 1"');
    for (const file of ["viewmodels/memory-review.ts", "views/MemoriesView.tsx"]) {
      expect(read(`apps/dashboard/src/${file}`)).not.toMatch(/meta\.(page|limit)\b/);
    }
    // Una página fuera de rango (200 con data vacía) conserva el total real.
    const empty = memoryListReducer(listStateWith({ page: 9 }), {
      type: "list-loaded", items: [], hasMore: false, lastPage: 3, total: 25,
    });
    expect(empty.status).toBe("empty");
    expect(empty.total).toBe(25);
  });
});

describe("CA-53 unified-reports-and-feedback", () => {
  const pageReport = () => cancellationReport({ meta: { current_page: 2, last_page: 3, per_page: 50, total: 120 } });

  it("Cancelaciones pagina las filas (50 por página) con números y total", () => {
    const html = renderReport(readyReportState({ report: pageReport() }));
    expect(html).toContain("Página 2 de 3 · 120 en total");
    expect(html).toContain("120 registros");
    expect(html).toContain('aria-label="Paginación"');
  });

  it("los totales y la conciliación son los mismos en cualquier página", () => {
    const one = renderReport(readyReportState({ report: cancellationReport({ meta: { current_page: 1, last_page: 3, per_page: 50, total: 120 } }) }));
    const two = renderReport(readyReportState({ report: pageReport() }));
    const section = (html: string) => html.slice(html.indexOf("Totales del periodo"), html.indexOf("Boletos cancelados</h2>"));
    expect(section(one)).toBe(section(two));
  });

  it("al cambiar filtros o periodo vuelve a la página 1; el cambio de página conserva el filtro", () => {
    const onPage3 = { ...initialCancellationReportState.query, cashier_id: 4, page: 3 };
    expect(buildCancellationQuery({ ...emptyCancellationFilters, cashierId: "4" }).page).toBeUndefined();
    expect(buildCancellationQuery({ ...emptyCancellationFilters, period: "month" }).page).toBeUndefined();
    const next = cancellationReportReducer(initialCancellationReportState, { type: "query-changed", query: onPage3 });
    expect(next.query).toMatchObject({ cashier_id: 4, page: 3 });
    expect(read("apps/dashboard/src/viewmodels/useCancellationReport.ts")).toContain("query: { ...state.query, page }");
  });

  it("la exportación no se pagina: envía page solo al reporte en pantalla", async () => {
    const urls: string[] = [];
    const fetchImpl: typeof fetch = async (input) => {
      urls.push(String(input));
      return new Response(JSON.stringify({ data: { rows: [] }, meta: pageReport().meta }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };
    const api = createAdminApi(createHttpClient({ baseUrl: "", fetchImpl }));
    const result = await api.reports.cancellations({ period: "week", page: 2 });
    await api.reports.exportCancellations({ period: "week", page: 2 }, "csv").catch(() => undefined);

    expect(urls[0]).toBe("/api/v1/admin/reports/cancellations?period=week&page=2");
    expect(result.meta?.total).toBe(120);
    expect(urls[1]).toBe("/api/v1/admin/reports/cancellations/export?period=week&format=csv");
  });
});

describe("CA-54 unified-reports-and-feedback", () => {
  it("@arca/api-client cambia de forma aditiva: tipos con total y has_more opcional, y page en Cancelaciones", () => {
    const types = read("packages/api-client/admin-types.ts");
    expect(types).toContain("export type ListPageMeta");
    expect(types).toMatch(/has_more\?: boolean/);
    expect(types).toContain("export type TotalPage<T>");
    expect(types).toContain("export type HasMorePage<T>");
    expect(types).toMatch(/CancellationReportQuery = {[^}]*page\?: number/s);
    expect(read("packages/api-client/index.ts")).toMatch(/ListPageMeta,[\s\S]*TotalPage/);
  });

  it("normaliza la lista aunque la API aún no envíe total", () => {
    const normalized = createAdminApi({ get: async () => ({ data: [1], meta: { has_more: true } }) } as never);
    return normalized.speciesPublicationRequests.list().then((page) => {
      expect(page.meta).toMatchObject({ current_page: 1, last_page: 1, total: 1, has_more: true });
    });
  });
});

describe("CA-55 unified-reports-and-feedback", () => {
  const appCopies = [
    "apps/dashboard/src/viewmodels/countdown.ts",
    "apps/dashboard/src/viewmodels/useCountdown.ts",
    "apps/dashboard/src/viewmodels/pagination.ts",
    "apps/dashboard/src/components/LockoutNotice.tsx",
    "apps/dashboard/src/components/Pagination.tsx",
    "apps/pwa/src/viewmodels/countdown.ts",
    "apps/pwa/src/viewmodels/useCountdown.ts",
    "apps/pwa/src/components/LockoutNotice.tsx",
  ];

  it("ninguna app conserva copias locales del contador, del aviso de bloqueo ni de la paginación", () => {
    for (const path of appCopies) expect(existsSync(`${root}${path}`), path).toBe(false);
    for (const app of ["dashboard", "pwa"]) {
      for (const directory of ["views", "components", "viewmodels"]) {
        for (const file of readdirSync(`${root}apps/${app}/src/${directory}`)) {
          if (!/\.tsx?$/.test(file)) continue;
          const code = read(`apps/${app}/src/${directory}/${file}`);
          expect(code, `${app}/${directory}/${file}`).not.toMatch(/export function (formatCountdown|startCountdown|useCountdown|buildPagination|pageItems|LockoutNotice|Pagination)\b/);
          expect(code, `${app}/${directory}/${file}`).not.toMatch(/viewmodels\/(countdown|useCountdown|pagination)"|components\/(LockoutNotice|Pagination)"/);
        }
      }
    }
  });

  it("ningún paginador está hecho a mano: «Página X de Y» o «Anterior/Siguiente» solo salen de @arca/ui", () => {
    const handMade = [
      /Página\s*\{[^}]+\}\s*de\s*\{/, // «Página {n} de {m}»
      />\s*[←‹«]?\s*(Anterior|Siguiente)\s*[→›»]?\s*</, // botones de texto Anterior/Siguiente
      /aria-label=(["'`])Página (anterior|siguiente)\1/,
    ];

    for (const app of ["dashboard", "pwa"]) {
      for (const directory of ["views", "components", "sections"]) {
        const folder = `${root}apps/${app}/src/${directory}`;

        if (!existsSync(folder)) continue;
        for (const file of readdirSync(folder)) {
          if (!/\.tsx?$/.test(file)) continue;
          const code = read(`apps/${app}/src/${directory}/${file}`);

          for (const pattern of handMade) expect(code, `${app}/${directory}/${file} ${pattern}`).not.toMatch(pattern);
        }
      }
    }
    // El detector sí reconoce el marcado de un paginador propio.
    expect("<span>Página {currentPage} de {totalPages}</span>").toMatch(handMade[0]);
    expect("<Button>← Anterior</Button>").toMatch(handMade[1]);
    expect("<Button aria-label=\"Página siguiente\">").toMatch(handMade[2]);
    // La PWA usa el paginador compartido con total y paginación en cliente (pwa-005).
    expect(read("apps/pwa/src/views/AnimalsView.tsx")).toMatch(/<Pagination\s+page=\{currentPage\}\s+lastPage=\{totalPages\}\s+total=\{sorted\.length\}/);
  });

  it("las vistas importan el contador y la paginación desde @arca/ui", () => {
    expect(read("apps/pwa/src/views/AnimalsView.tsx")).toMatch(/Pagination[^;]*from '@arca\/ui'/s);
    expect(read("apps/dashboard/src/views/LoginView.tsx")).toMatch(/useCountdown[^;]*from "@arca\/ui"/s);
    expect(read("apps/pwa/src/views/LoginView.tsx")).toMatch(/LockoutNotice[^;]*from '@arca\/ui'/s);
    expect(read("apps/pwa/src/views/OwnSpeciesRequestsView.tsx")).toMatch(/Pagination[^;]*from '@arca\/ui'/s);
  });
});

describe("CA-27 ticket-cancellation-report", () => {
  it("las filas se paginan de 50 en 50 con números y total; al filtrar vuelve a la página 1 y los totales no cambian", () => {
    const meta = { current_page: 2, last_page: 3, per_page: 50, total: 120 };
    const html = renderReport(readyReportState({ report: cancellationReport({ meta }) }));
    expect(html).toContain("Página 2 de 3 · 120 en total");
    expect(buildCancellationQuery({ ...emptyCancellationFilters, reasonCode: "other" }).page).toBeUndefined();
    expect(read("apps/dashboard/src/views/CancellationReportView.tsx")).toContain("report.meta &&");
  });
});

describe("CA-28 ticket-cancellation-report", () => {
  it("el cliente envía page al reporte y la exportación no lo lleva", () => {
    const admin = read("packages/api-client/admin.ts");
    expect(admin).toContain("page: query.page");
    expect(admin).toMatch(/exportCancellations[\s\S]*?\.\.\.cancellationParams\(query\),\s*format/);
    expect(admin).toMatch(/function cancellationParams[\s\S]*?reason_code: query\.reason_code,\s*};/);
  });
});

describe("CA-80 public-content-management", () => {
  it("Solicitudes y Publicadas de TulanPedia muestran páginas con total (current_page, last_page y total de meta)", () => {
    expect(read("apps/dashboard/src/viewmodels/species-requests.ts")).toContain("lastPage: page.meta.last_page");
    expect(read("apps/dashboard/src/viewmodels/published-species.ts")).toContain("total: page.meta.total");
    expect(read("apps/dashboard/src/views/SpeciesRequestsView.tsx")).toContain("lastPage={list.lastPage}");
    expect(read("apps/dashboard/src/views/PublishedSpeciesView.tsx")).toContain("total={list.total}");
  });
});

describe("CA-49 memory-moderation", () => {
  it("Momentos pagina con total y lee current_page/last_page/total de meta, sin meta.page ni meta.limit", () => {
    expect(read("apps/dashboard/src/viewmodels/memory-review.ts")).toContain("lastPage: result.meta.last_page");
    expect(read("apps/dashboard/src/views/MemoriesView.tsx")).toContain("lastPage={state.lastPage}");
    expect(read("packages/api-client/admin-types.ts")).toMatch(/MemoryReviewListQuery = {[^}]*limit\?: number/s);
  });
});
