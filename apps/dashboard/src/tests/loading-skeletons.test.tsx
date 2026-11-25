import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Skeleton,
  SkeletonCards,
  SkeletonForm,
  SkeletonRegion,
  SkeletonTable,
  SKELETON_DELAY_MS,
  startDelayedFlag,
  useDelayedFlag,
} from "@arca/ui";
import {
  CANCELLATION_BREAKDOWN_CASHIER_COLUMNS,
  CANCELLATION_BREAKDOWN_REASON_COLUMNS,
  CANCELLATION_CASHIER_COLUMNS,
  CANCELLATION_DAY_COLUMNS,
  CANCELLATION_ROW_COLUMNS,
  CANCELLATION_TRAFFIC_COLUMNS,
  CancellationReportSkeleton,
  CardGridSkeleton,
  DashboardSummarySkeleton,
  DetailSkeleton,
  FormSkeleton,
  PricesSkeleton,
  TICKET_REPORT_DAILY_COLUMNS,
  TICKET_REPORT_TICKET_COLUMNS,
  TableSkeleton,
  TicketReportSkeleton,
} from "@/components/LoadingSkeletons";
import { ListStatusMessage } from "@/components/ListStatusMessage";

const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8");
const source = (path: string) => read(`../${path}`);
const uiSource = (path: string) => read(`../../../../packages/ui/src/${path}`);
const count = (text: string, needle: string) => text.split(needle).length - 1;

afterEach(() => vi.useRealTimers());

describe("CA-56 unified-reports-and-feedback (loading-skeletons): componentes compartidos de @arca/ui", () => {
  it("Skeleton ofrece las variantes de texto, título, avatar, imagen y botón", () => {
    for (const variant of ["text", "title", "avatar", "image", "button"] as const) {
      expect(renderToStaticMarkup(<Skeleton variant={variant} />)).toContain(`arca-skeleton--${variant}`);
    }

    expect(renderToStaticMarkup(<Skeleton variant="image" aspectRatio="4 / 3" />)).toContain("aspect-ratio:4 / 3");
  });

  it("SkeletonTable repite el encabezado, las columnas y las filas pedidas", () => {
    const markup = renderToStaticMarkup(
      <SkeletonTable
        columns={["Folio", "Total", { header: "Estado", className: "col-estado" }]}
        rows={4}
        caption="Boletos"
        className="table-scroll"
        tableClassName="data-table"
      />,
    );

    expect(count(markup, "<th ")).toBe(3);
    expect(markup).toContain('scope="col">Folio</th>');
    expect(markup).toContain('class="col-estado"');
    expect(count(markup, "<tr>")).toBe(5);
    expect(count(markup, "<td ")).toBe(12);
    expect(markup).toContain('data-label="Total"');
    expect(markup).toContain("arca-skeleton-table table-scroll");
    expect(markup).toContain('<table class="data-table">');
  });

  it("SkeletonCards crea la rejilla configurable con imagen opcional", () => {
    const withImage = renderToStaticMarkup(
      <SkeletonCards count={3} imageRatio="4 / 3" className="species-grid" cardClassName="species-card" actions={2} />,
    );
    const noImage = renderToStaticMarkup(<SkeletonCards count={2} image={false} />);

    expect(count(withImage, 'class="arca-skeleton-card species-card"')).toBe(3);
    expect(withImage).toContain("species-grid");
    expect(count(withImage, "arca-skeleton--image")).toBe(3);
    expect(count(withImage, "arca-skeleton--button")).toBe(6);
    expect(noImage).not.toContain("arca-skeleton--image");
    expect(count(noImage, 'class="arca-skeleton-card"')).toBe(2);
  });

  it("SkeletonForm dibuja campos y botones", () => {
    const markup = renderToStaticMarkup(<SkeletonForm fields={3} buttons={2} columns={2} />);

    expect(count(markup, "arca-skeleton-form__field\"")).toBe(3);
    expect(markup).toContain("arca-skeleton-form__fields--2");
    expect(count(markup, "arca-skeleton-form__buttons")).toBe(1);
  });
});

describe("CA-57 unified-reports-and-feedback (loading-skeletons): accesibilidad", () => {
  it("el contenedor lleva aria-busy y un «Cargando…» oculto con role=status; los bloques van aria-hidden", () => {
    for (const markup of [
      renderToStaticMarkup(<SkeletonTable columns={["A"]} />),
      renderToStaticMarkup(<SkeletonCards />),
      renderToStaticMarkup(<SkeletonForm />),
      renderToStaticMarkup(<SkeletonRegion><Skeleton /></SkeletonRegion>),
    ]) {
      expect(markup).toContain('aria-busy="true"');
      expect(markup).toContain('<p class="arca-visually-hidden" role="status">Cargando…</p>');
      expect(markup).toContain('aria-hidden="true"');
    }

    expect(renderToStaticMarkup(<Skeleton />)).toContain('aria-hidden="true"');
  });

  it("acepta una etiqueta propia y puede anidarse sin repetir el aviso", () => {
    expect(renderToStaticMarkup(<SkeletonTable columns={["A"]} label="Cargando cuentas…" />)).toContain(
      "Cargando cuentas…",
    );

    const nested = renderToStaticMarkup(<SkeletonTable columns={["A"]} region={false} />);

    expect(nested).not.toContain("aria-busy");
    expect(nested).not.toContain('role="status"');
  });
});

describe("CA-58 unified-reports-and-feedback (loading-skeletons): brillo con tokens y reduced motion", () => {
  const css = uiSource("styles.css");
  const block = css.slice(css.indexOf("Esqueletos de carga"));

  it("anima solo bajo prefers-reduced-motion: no-preference y deja un bloque estático si se reduce", () => {
    expect(block).toMatch(/@media \(prefers-reduced-motion: no-preference\)[\s\S]*?animation: arca-skeleton-shimmer/);
    expect(block).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/);
    // Fuera de esas consultas no hay animación.
    const outside = block.replace(/@media \(prefers-reduced-motion[\s\S]*$/, "");

    expect(outside).not.toContain("animation");
  });

  it("solo usa tokens (sin hex) y medidas en rem (sin px)", () => {
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/\d\s*px\b/);
    expect(block).toContain("var(--muted-foreground)");
    expect(block).toContain("var(--surface)");
  });
});

describe("CA-59 unified-reports-and-feedback (loading-skeletons): retraso para no parpadear", () => {
  const scheduler = () => {
    const timers: { callback: () => void; ms: number; cancelled: boolean }[] = [];

    return {
      timers,
      api: {
        setTimeout: (callback: () => void, ms: number) => {
          const timer = { callback, ms, cancelled: false };

          timers.push(timer);

          return timer;
        },
        clearTimeout: (handle: unknown) => {
          (handle as { cancelled: boolean }).cancelled = true;
        },
      },
    };
  };

  it("el retraso por defecto es de 150 ms", () => {
    expect(SKELETON_DELAY_MS).toBe(150);
  });

  it("avisa solo cuando pasa el retraso", () => {
    vi.useFakeTimers();
    const elapsed = vi.fn();

    startDelayedFlag(150, elapsed);
    vi.advanceTimersByTime(149);
    expect(elapsed).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(elapsed).toHaveBeenCalledTimes(1);
  });

  it("no avisa si la carga termina antes (se cancela)", () => {
    vi.useFakeTimers();
    const elapsed = vi.fn();
    const cancel = startDelayedFlag(150, elapsed);

    vi.advanceTimersByTime(100);
    cancel();
    vi.advanceTimersByTime(500);

    expect(elapsed).not.toHaveBeenCalled();
  });

  it("usa el planificador recibido y cancela su temporizador", () => {
    const fake = scheduler();
    const elapsed = vi.fn();
    const cancel = startDelayedFlag(150, elapsed, fake.api);

    expect(fake.timers[0].ms).toBe(150);
    cancel();
    expect(fake.timers[0].cancelled).toBe(true);
    fake.timers[0].callback();
    expect(elapsed).not.toHaveBeenCalled();
  });

  it("con retraso 0 avisa de inmediato", () => {
    const elapsed = vi.fn();

    startDelayedFlag(0, elapsed);

    expect(elapsed).toHaveBeenCalledTimes(1);
  });

  it("useDelayedFlag no muestra nada al montar con retraso y sigue a active sin retraso", () => {
    function Probe({ active, delayMs }: { active: boolean; delayMs?: number }) {
      return <span>{String(useDelayedFlag(active, delayMs))}</span>;
    }

    expect(renderToStaticMarkup(<Probe active delayMs={150} />)).toContain("false");
    expect(renderToStaticMarkup(<Probe active={false} delayMs={150} />)).toContain("false");
    expect(renderToStaticMarkup(<Probe active delayMs={0} />)).toContain("true");
    expect(renderToStaticMarkup(<Probe active={false} delayMs={0} />)).toContain("false");
  });

  it("el esqueleto de una pantalla empieza solo con el aviso accesible y muestra los bloques sin retraso", () => {
    const pending = renderToStaticMarkup(<TableSkeleton columns={["Folio"]} label="Cargando cuentas…" />);
    const shown = renderToStaticMarkup(<TableSkeleton columns={["Folio"]} label="Cargando cuentas…" delayMs={0} />);

    expect(pending).toContain("Cargando cuentas…");
    expect(pending).not.toContain("<table");
    expect(shown).toContain("<table");
  });

  it("una carga en segundo plano (datos visibles) no muestra esqueleto", () => {
    const hidden = renderToStaticMarkup(
      <ListStatusMessage status="ready" error="" loadingText="" emptyText="" onRetry={() => undefined}
        skeleton={<TableSkeleton columns={["A"]} delayMs={0} />} />,
    );

    expect(hidden).toBe("");
  });
});

/** Inventario de pantallas del dashboard y el esqueleto que usan al cargar. */
const INVENTORY: { screen: string; file: string; skeleton: string; kind: string }[] = [
  { screen: "Usuarios", file: "views/UsersView.tsx", skeleton: "TableSkeleton", kind: "tabla" },
  { screen: "Reportes / Boletos", file: "views/TicketReportView.tsx", skeleton: "TicketReportSkeleton", kind: "reporte" },
  { screen: "Reportes / Cancelaciones", file: "views/CancellationReportView.tsx", skeleton: "CancellationReportSkeleton", kind: "reporte" },
  { screen: "Historial de taquilla", file: "views/TicketHistoryView.tsx", skeleton: "TableSkeleton", kind: "tabla" },
  { screen: "Zoopedia / Solicitudes", file: "views/SpeciesRequestsView.tsx", skeleton: "TableSkeleton", kind: "tabla" },
  { screen: "Momentos", file: "views/MemoriesView.tsx", skeleton: "TableSkeleton", kind: "tabla" },
  { screen: "Noticias", file: "views/NewsView.tsx", skeleton: 'CardGridSkeleton kind="news"', kind: "tarjetas" },
  { screen: "Eventos", file: "views/EventsView.tsx", skeleton: 'CardGridSkeleton kind="events"', kind: "tarjetas" },
  { screen: "Recintos", file: "views/EnclosuresView.tsx", skeleton: 'CardGridSkeleton kind="enclosures"', kind: "tarjetas" },
  { screen: "Zoopedia / Publicadas", file: "views/PublishedSpeciesView.tsx", skeleton: 'CardGridSkeleton kind="species"', kind: "tarjetas" },
  { screen: "Panel principal", file: "views/DashboardView.tsx", skeleton: "DashboardSummarySkeleton", kind: "panel" },
  { screen: "Detalle de especie publicada", file: "views/PublishedSpeciesDetailView.tsx", skeleton: "DetailSkeleton", kind: "detalle" },
  { screen: "Detalle de solicitud", file: "views/SpeciesRequestDetailView.tsx", skeleton: "DetailSkeleton", kind: "detalle" },
  { screen: "Detalle de recuerdo", file: "views/MemoryReviewDetailView.tsx", skeleton: "DetailSkeleton", kind: "detalle" },
  { screen: "Precios", file: "views/TicketPricesView.tsx", skeleton: "PricesSkeleton", kind: "precios" },
  { screen: "Venta", file: "views/TicketSaleView.tsx", skeleton: "PriceLineSkeleton", kind: "precios vigentes" },
];

describe("CA-60 unified-reports-and-feedback (loading-skeletons): cada pantalla usa un esqueleto al cargar", () => {
  it.each(INVENTORY)("$screen ($kind) usa $skeleton y ya no usa el indicador de texto", ({ file, skeleton }) => {
    const text = source(file);

    expect(text).toContain(`<${skeleton}`);
    expect(text).not.toContain("LoadingIndicator");
    expect(text).toContain('from "@/components/LoadingSkeletons"');
  });

  it("los reportes pasan su esqueleto a ReportViewState y este usa el de @arca/ui", () => {
    const state = source("components/ReportViewState.tsx");

    expect(state).toContain("skeleton");
    expect(state).not.toContain("report-loading");
    expect(source("styles.css")).not.toContain("report-loading");
    expect(source("components/LoadingSkeletons.tsx")).toContain('from "@arca/ui"');
    expect(source("components/LoadingSkeletons.tsx")).toContain("SkeletonTable");
  });
});

describe("CA-61 unified-reports-and-feedback (loading-skeletons): las tablas llevan sus columnas reales", () => {
  const headersOf = (file: string) =>
    [...source(file).matchAll(/header: "([^"]+)"/g)].map((match) => match[1]);

  it("Boletos: los encabezados del esqueleto están en TicketReportView", () => {
    const view = source("views/TicketReportView.tsx");

    for (const header of [...TICKET_REPORT_DAILY_COLUMNS, ...TICKET_REPORT_TICKET_COLUMNS]) {
      expect(view).toContain(`header: "${header}"`);
    }

    const markup = renderToStaticMarkup(<TicketReportSkeleton delayMs={0} />);

    expect(markup).toContain('data-label="Ingresos"');
    expect(markup).toContain('data-label="Fecha y hora"');
    expect(count(markup, "report-metric\"")).toBe(4);
  });

  it("Cancelaciones: totales, conciliación, semáforo y boletos con sus columnas", () => {
    const view = source("views/CancellationReportView.tsx");
    const traffic = source("components/CancellationTrafficLightTable.tsx");

    for (const header of [
      ...CANCELLATION_BREAKDOWN_CASHIER_COLUMNS,
      ...CANCELLATION_BREAKDOWN_REASON_COLUMNS,
      ...CANCELLATION_DAY_COLUMNS,
      ...CANCELLATION_CASHIER_COLUMNS,
      ...CANCELLATION_ROW_COLUMNS,
    ]) {
      expect(view).toContain(`header: "${header}"`);
    }

    for (const header of CANCELLATION_TRAFFIC_COLUMNS) {
      expect(traffic).toContain(`header: "${header}"`);
    }

    const markup = renderToStaticMarkup(<CancellationReportSkeleton delayMs={0} />);

    expect(markup).toContain('data-label="Revisión vigente"');
    expect(markup).toContain('data-label="Vendido bruto"');
    expect(markup).toContain('data-label="Comentario"');
    expect(count(markup, "<table")).toBe(6);
    expect(count(markup, "report-metric\"")).toBe(2);
  });

  it.each([
    ["Usuarios", "views/UsersView.tsx"],
    ["Historial de taquilla", "views/TicketHistoryView.tsx"],
    ["Zoopedia Solicitudes", "views/SpeciesRequestsView.tsx"],
    ["Momentos", "views/MemoriesView.tsx"],
  ])("%s pasa a su esqueleto las mismas columnas de su DataTable", (_screen, file) => {
    const text = source(file);

    expect(text).toMatch(/<TableSkeleton columns=\{columns\}/);
    expect(text).toMatch(/<DataTable[\s\S]*?columns=\{columns\}/);
    expect(headersOf(file).length).toBeGreaterThan(3);
  });

  it("usa la tabla real (misma envoltura y clase) para heredar el alto de fila", () => {
    const markup = renderToStaticMarkup(<TableSkeleton columns={["Nombre", "Rol"]} delayMs={0} />);

    expect(markup).toContain("table-scroll data-table-scroll");
    expect(markup).toContain('<table class="data-table">');
    expect(source("components/DataTable.tsx")).toContain("table-scroll data-table-scroll");
    expect(count(markup, "<tr>")).toBe(6);
  });
});

describe("CA-62 unified-reports-and-feedback (loading-skeletons): las tarjetas usan la misma rejilla", () => {
  it.each([
    ["news", "content-card-grid", "views/NewsView.tsx", 3],
    ["events", "event-card-grid", "views/EventsView.tsx", 4],
    ["enclosures", "enclosure-grid", "views/EnclosuresView.tsx", 4],
    ["species", "species-grid", "views/PublishedSpeciesView.tsx", 6],
  ] as const)("%s usa la clase %s de su vista", (kind, grid, file, cards) => {
    const markup = renderToStaticMarkup(<CardGridSkeleton kind={kind} delayMs={0} />);

    expect(markup).toContain(grid);
    expect(source(file)).toContain(grid);
    expect(count(markup, "arca-skeleton-card ")).toBe(cards);
  });

  it("Zoopedia Publicadas lleva la imagen 4:3 de su tarjeta", () => {
    const markup = renderToStaticMarkup(<CardGridSkeleton kind="species" delayMs={0} />);

    expect(markup).toContain("aspect-ratio:4 / 3");
    expect(source("styles.css")).toMatch(/\.species-card__media \{\s*aspect-ratio: 4 \/ 3/);
  });

  it("Recintos no lleva imagen y Noticias y Eventos usan el alto de la miniatura", () => {
    expect(renderToStaticMarkup(<CardGridSkeleton kind="enclosures" delayMs={0} />)).not.toContain(
      "arca-skeleton--image",
    );
    expect(renderToStaticMarkup(<CardGridSkeleton kind="news" delayMs={0} />)).toContain("height:8.125rem");
    expect(source("styles.css")).toMatch(/\.content-card__thumb \{[^}]*height: 130px/);
  });
});

describe("CA-63 unified-reports-and-feedback (loading-skeletons): panel, detalles, formularios y precios", () => {
  it("el panel principal muestra métricas y la gráfica", () => {
    const markup = renderToStaticMarkup(<DashboardSummarySkeleton delayMs={0} />);

    expect(count(markup, "report-metric\"")).toBe(8);
    expect(markup).toContain("chart-card");
    expect(count(markup, "loading-skeleton__bar-row")).toBe(7);
  });

  it("los detalles de especie y solicitud incluyen el formulario de la ficha; el de recuerdo no", () => {
    expect(renderToStaticMarkup(<DetailSkeleton withForm delayMs={0} />)).toContain("arca-skeleton-form");
    expect(renderToStaticMarkup(<DetailSkeleton delayMs={0} />)).not.toContain("arca-skeleton-form");
    expect(renderToStaticMarkup(<FormSkeleton delayMs={0} fields={3} />)).toContain("arca-skeleton-form");
    expect(source("views/PublishedSpeciesDetailView.tsx")).toContain("<DetailSkeleton");
    expect(source("views/SpeciesRequestDetailView.tsx")).toMatch(/<DetailSkeleton[^>]*withForm/);
  });

  it("Precios muestra las tarjetas de Adulto y Niño y Venta un precio de relleno", () => {
    const markup = renderToStaticMarkup(<PricesSkeleton delayMs={0} />);

    expect(count(markup, "ticket-type-card")).toBe(2);
    expect(source("views/TicketSaleView.tsx")).not.toContain('"Cargando…"');
  });
});

describe("CA-64 unified-reports-and-feedback (loading-skeletons): no cambia la lógica de carga", () => {
  it("solo aparece cuando la vista ya estaba cargando; las vistas no leen datos del esqueleto", () => {
    const users = source("views/UsersView.tsx");

    // Usuarios conserva sus filas visibles en una recarga (items.length > 0) y no pone esqueleto.
    expect(users).toMatch(/items\.length === 0 \?[\s\S]*?<TableSkeleton/);
    expect(users).toContain('status === "loading" && items.length > 0');

    for (const { file } of INVENTORY) {
      expect(source(file)).not.toMatch(/useDelayedFlag/);
    }
  });

  it("los ViewModels no importan esqueletos", () => {
    for (const file of ["useTicketHistory", "useStaffAccounts", "useMemoryReviewList", "useDashboardSummary"]) {
      expect(source(`viewmodels/${file}.ts`)).not.toMatch(/Skeleton/);
    }
  });
});

describe("CA-65 unified-reports-and-feedback (loading-skeletons): unidades relativas y sin dependencias", () => {
  it("el CSS del dashboard para esqueletos usa rem y no px", () => {
    const css = source("styles.css");
    const block = css.slice(css.indexOf("dashboard-020 rev. (e)"));

    expect(block).not.toMatch(/\d\s*px\b/);
    expect(block).toContain("rem");
  });

  it("los componentes del paquete solo importan React", () => {
    for (const file of ["skeleton.tsx", "useDelayedFlag.ts", "delayedFlag.ts"]) {
      const imports = [...uiSource(file).matchAll(/from "([^"]+)"/g)].map((match) => match[1]);

      for (const specifier of imports) expect(["react", "./delayedFlag"]).toContain(specifier);
    }
  });
});
