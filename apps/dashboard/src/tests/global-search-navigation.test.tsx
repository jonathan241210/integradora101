import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "../components/GlobalSearch";
import { SearchHitBanner } from "../components/SearchHitBanner";
import { ListStatusMessage } from "../components/ListStatusMessage";
import {
  HIT_DURATION_MS,
  NOT_AVAILABLE_MESSAGE,
  hitBannerText,
  hitMessage,
  locateElement,
  resolveFocusAction,
  searchIdOf,
  tabForKind,
} from "../viewmodels/focus-target";
import {
  DEBOUNCE_MS,
  SEARCH_ERROR,
  SEARCH_HINT,
  SEARCH_LOADING,
  createGlobalSearchController,
  highlightSegments,
  nextActiveIndex,
  orderSearchGroups,
  searchEmptyMessage,
  type SearchSectionInfo,
} from "../viewmodels/global-search";
import { getNavigationForProfile } from "../viewmodels/navigation";
import { pageOfEnclosure } from "../viewmodels/enclosures-management";
import { effectiveHistoryQuery } from "../viewmodels/ticket-history";
import { pageOfEvent } from "../viewmodels/useEventsPagination";
import type { GlobalSearchViewModel } from "../viewmodels/useGlobalSearch";
import { enclosure } from "./admin-fixtures";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const styles = read("styles.css");

const sections: SearchSectionInfo[] = [
  { id: "users", label: "Usuarios", icon: "users" },
  { id: "enclosures", label: "Recintos", icon: "building" },
  { id: "tulanpedia", label: "TulanPedia", icon: "animals" },
];
const groups = [
  { section: "users", label: "Usuarios", items: [{ id: 1, title: "Lobo Pérez", subtitle: "Cuenta" }] },
  { section: "enclosures", label: "Recintos", items: [{ id: 2, title: "Recinto Lobos", subtitle: "Activo" }] },
  {
    section: "tulanpedia",
    label: "TulanPedia",
    items: [{ id: 3, title: "Lobo gris", subtitle: "Publicada", kind: "published-species" as const }],
  },
  { section: "news", label: "Noticias", items: [] },
];

function view(overrides: Partial<GlobalSearchViewModel> = {}): GlobalSearchViewModel {
  const display = orderSearchGroups(groups, "enclosures", sections, "lobo");

  return {
    query: "lobo",
    trimmedQuery: "lobo",
    status: "ready",
    groups: display,
    results: display.flatMap((group) => group.results),
    open: true,
    activeIndex: -1,
    actions: {
      change: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      keyDown: vi.fn(() => false),
      choose: vi.fn(),
      hover: vi.fn(),
    },
    ...overrides,
  };
}

describe("CA-12 enclosure-actions-global-search", () => {
  it("sustituye el campo demostrativo por un combobox accesible dentro de .search-box", () => {
    const markup = renderToStaticMarkup(<GlobalSearch {...view({ activeIndex: 1 })} />);

    expect(markup).toContain('class="search-box"');
    expect(markup).toContain("Buscar en el panel");
    expect(markup).toContain('role="combobox"');
    expect(markup).toContain('aria-expanded="true"');
    expect(markup).toContain('aria-controls="global-search-listbox"');
    expect(markup).toContain('aria-activedescendant="global-search-option-1"');
    expect(read("App.tsx")).not.toContain("Buscar en el panel (demostración)");
    expect(read("App.tsx")).toContain("<GlobalSearch");
  });
});

describe("CA-13 enclosure-actions-global-search", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("con menos de 2 caracteres no llama a la API y muestra la ayuda", () => {
    const search = vi.fn(async () => ({ groups: [] }));
    const controller = createGlobalSearchController(search, () => undefined);

    controller.setQuery("l");
    vi.advanceTimersByTime(1000);
    expect(search).not.toHaveBeenCalled();
    expect(controller.snapshot().status).toBe("idle");
    expect(renderToStaticMarkup(<GlobalSearch {...view({ status: "idle", query: "l", trimmedQuery: "l", groups: [], results: [] })} />)).toContain(SEARCH_HINT);
    expect(SEARCH_HINT).toBe("Escribe al menos 2 caracteres.");
  });

  it("espera 300 ms y hace una sola llamada; una respuesta vieja no sobrescribe a la nueva", async () => {
    let resolveFirst: (value: { groups: [] }) => void = () => undefined;
    const search = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(async () => ({ groups }));
    const controller = createGlobalSearchController(search, () => undefined);

    controller.setQuery("lo");
    controller.setQuery("lob");
    controller.setQuery("lobo");
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("lobo");

    controller.setQuery("lobos");
    vi.advanceTimersByTime(DEBOUNCE_MS);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.snapshot().status).toBe("ready");

    resolveFirst({ groups: [] });
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.snapshot().groups).toHaveLength(4);
  });
});

describe("CA-14 enclosure-actions-global-search", () => {
  it("muestra «Buscando…» con role status, el vacío y el error", () => {
    const loading = renderToStaticMarkup(<GlobalSearch {...view({ status: "loading", groups: [], results: [] })} />);
    expect(loading).toContain('role="status"');
    expect(loading).toContain(SEARCH_LOADING);
    expect(SEARCH_LOADING).toBe("Buscando…");

    const empty = renderToStaticMarkup(<GlobalSearch {...view({ status: "empty", trimmedQuery: "xyz", groups: [], results: [] })} />);
    expect(empty).toContain("No encontramos «xyz» en el panel.");
    expect(searchEmptyMessage("xyz")).toBe("No encontramos «xyz» en el panel.");

    const failed = renderToStaticMarkup(<GlobalSearch {...view({ status: "error", groups: [], results: [] })} />);
    expect(failed).toContain(SEARCH_ERROR);
    expect(SEARCH_ERROR).toBe("No pudimos buscar. Inténtalo de nuevo.");
  });

  it("un fallo de la llamada deja el estado en error", async () => {
    vi.useFakeTimers();
    const controller = createGlobalSearchController(async () => { throw new Error("x"); }, () => undefined);

    controller.setQuery("lobo");
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    expect(controller.snapshot().status).toBe("error");
    vi.useRealTimers();
  });
});

describe("CA-15 enclosure-actions-global-search", () => {
  it("la sección actual va primero, los demás «En <Sección>» y «Secciones» al final; sin grupos vacíos", () => {
    const ordered = orderSearchGroups(groups, "enclosures", sections, "recint");

    expect(ordered.map((group) => group.heading)).toEqual([
      "En esta sección",
      "En Usuarios",
      "En TulanPedia",
      "Secciones",
    ]);
    expect(ordered.some((group) => group.key === "api-news")).toBe(false);
    expect(orderSearchGroups(groups, "news", sections, "lobo").map((g) => g.heading)).not.toContain("En esta sección");
  });
});

describe("CA-16 enclosure-actions-global-search", () => {
  it("↑ y ↓ mueven el índice activo con límites; cada resultado nombra su sección", () => {
    expect(nextActiveIndex(-1, "ArrowDown", 3)).toBe(0);
    expect(nextActiveIndex(0, "ArrowDown", 3)).toBe(1);
    expect(nextActiveIndex(2, "ArrowDown", 3)).toBe(2);
    expect(nextActiveIndex(2, "ArrowUp", 3)).toBe(1);
    expect(nextActiveIndex(0, "ArrowUp", 3)).toBe(0);
    expect(nextActiveIndex(0, "ArrowDown", 0)).toBe(-1);

    const markup = renderToStaticMarkup(<GlobalSearch {...view()} />);
    expect(markup).toContain('aria-label="Recinto Lobos, Recintos"');
    expect(markup).toContain('aria-selected="false"');
    expect(read("viewmodels/useGlobalSearch.ts")).toMatch(/"Escape" \|\| key === "Tab"/);
    expect(read("viewmodels/useGlobalSearch.ts")).toContain('key === "Enter"');
  });
});

describe("CA-17 enclosure-actions-global-search", () => {
  it("muestra el ícono con aria-hidden y resalta con <mark> sin innerHTML", () => {
    const markup = renderToStaticMarkup(<GlobalSearch {...view()} />);

    expect(markup).toContain("<mark>Lobo</mark>");
    expect(markup).toContain('class="global-search__icon" aria-hidden="true"');
    expect(highlightSegments("Árbol Álamo", "alamo")).toEqual([
      { text: "Árbol ", match: false },
      { text: "Álamo", match: true },
    ]);
    expect(highlightSegments("Sin", "xyz")).toEqual([{ text: "Sin", match: false }]);
    expect(read("components/GlobalSearch.tsx")).not.toContain("innerHTML");
    expect(read("viewmodels/global-search.ts")).not.toContain("innerHTML");
  });
});

describe("CA-18 enclosure-actions-global-search", () => {
  it("otra sección navega y TulanPedia abre la pestaña según kind", () => {
    expect(resolveFocusAction("users", { section: "enclosures" })).toBe("navigate");
    expect(tabForKind("published-species")).toBe("published");
    expect(tabForKind("species-request")).toBe("requests");
    expect(tabForKind(undefined)).toBeNull();
    expect(searchIdOf({ section: "tulanpedia", id: 3, kind: "published-species" })).toBe("tulanpedia:published-species:3");
    expect(read("sections/TulanpediaSection.tsx")).toContain("useTulanpediaTab(focus?.tab");
  });
});

describe("CA-19 enclosure-actions-global-search", () => {
  it("la misma sección solo ubica, sin pedir de nuevo la lista", () => {
    const onReload = vi.fn();
    const onFound = vi.fn();
    const element = { id: "el" };

    expect(resolveFocusAction("enclosures", { section: "enclosures" })).toBe("locate-only");
    vi.useFakeTimers();
    locateElement({ find: () => element, onFound, onReload, onMissing: vi.fn() });
    vi.advanceTimersByTime(10);
    vi.useRealTimers();
    expect(onFound).toHaveBeenCalledWith(element);
    expect(onReload).not.toHaveBeenCalled();
  });
});

describe("CA-20 enclosure-actions-global-search", () => {
  it("un recinto o evento en otra página abre la página que lo contiene", () => {
    const enclosures = Array.from({ length: 12 }, (_, i) => enclosure({ id: i + 1 }));
    const events = Array.from({ length: 9 }, (_, i) => ({ id: i + 1 })) as never[];

    expect(pageOfEnclosure(enclosures, 10)).toBe(2);
    expect(pageOfEnclosure(enclosures, 3)).toBe(1);
    expect(pageOfEvent(events, 9)).toBe(3);
    expect(pageOfEvent(events, 4)).toBe(1);
    expect(pageOfEvent(events, 99)).toBeNull();
  });
});

describe("CA-21 enclosure-actions-global-search", () => {
  it("el folio se pide aparte: el formulario de filtros conserva sus valores", () => {
    const query = { folio: "", status: "", from: "2026-01-01", to: "", page: 3 } as never;
    const before = JSON.stringify(query);
    const effective = effectiveHistoryQuery(query, "42");

    expect(effective).toMatchObject({ folio: "42", page: 1, from: "2026-01-01" });
    expect(JSON.stringify(query)).toBe(before);
    expect(effectiveHistoryQuery(query, null)).toBe(query);
  });
});

describe("CA-22 enclosure-actions-global-search", () => {
  it("usa .search-hit con contorno y pulso, sin pulso con movimiento reducido, y una etiqueta con ✕", () => {
    expect(HIT_DURATION_MS).toBe(4000);
    expect(styles).toMatch(/\.search-hit \{[^}]*outline: 4px solid var\(--accent\)[^}]*animation: search-hit-pulse/);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.search-hit \{\s*animation: none;/);
    expect(read("viewmodels/useLocateHit.ts")).toContain('{ block: "center", behavior: "smooth" }');

    const markup = renderToStaticMarkup(<SearchHitBanner banner={hitBannerText("lobo")} announcement="" onClear={vi.fn()} />);
    expect(markup).toContain("Resultado de tu búsqueda: «lobo»");
    expect(markup).toContain('aria-label="Quitar resaltado"');
  });
});

describe("CA-23 enclosure-actions-global-search", () => {
  it("anuncia «Mostrando «X» en <Sección>» en una región aria-live polite", () => {
    expect(hitMessage("lobo", "Recintos")).toBe("Mostrando «lobo» en Recintos");

    const markup = renderToStaticMarkup(<SearchHitBanner banner="" announcement={hitMessage("lobo", "Recintos")} onClear={vi.fn()} />);
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain("Mostrando «lobo» en Recintos");
  });
});

describe("CA-24 enclosure-actions-global-search", () => {
  it("si no aparece, recarga la lista una vez y luego avisa que ya no está disponible", () => {
    vi.useFakeTimers();
    const onReload = vi.fn();
    const onMissing = vi.fn();

    locateElement({ find: () => null, onFound: vi.fn(), onReload, onMissing, attempts: 3, intervalMs: 10 });
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onMissing).toHaveBeenCalledTimes(1);
    expect(NOT_AVAILABLE_MESSAGE).toBe("Ese elemento ya no está disponible.");
  });

  it("mientras la lista sigue cargando espera sin contar intentos y luego encuentra el elemento", () => {
    vi.useFakeTimers();
    let loading = true;
    let element: string | null = null;
    const onFound = vi.fn();
    const onMissing = vi.fn();

    locateElement({
      find: () => element,
      isLoading: () => loading,
      onFound,
      onReload: vi.fn(),
      onMissing,
      attempts: 3,
      intervalMs: 10,
    });
    vi.advanceTimersByTime(5000);
    expect(onMissing).not.toHaveBeenCalled();
    loading = false;
    element = "news:141";
    vi.advanceTimersByTime(20);
    vi.useRealTimers();

    expect(onFound).toHaveBeenCalledWith("news:141");
    expect(onMissing).not.toHaveBeenCalled();
  });

  it("marca el mensaje de carga de las listas para que el buscador sepa que debe esperar", () => {
    const markup = renderToStaticMarkup(
      <ListStatusMessage status="loading" error="" loadingText="Cargando noticias…" emptyText="" onRetry={vi.fn()} />,
    );
    expect(markup).toContain('data-list-loading="true"');
  });
});

describe("CA-25 enclosure-actions-global-search", () => {
  it("pinta los grupos recibidos y las coincidencias de sección solo para la navegación del perfil", () => {
    const profile = {
      id: 1,
      full_name: "Ana",
      email: "a@x.mx",
      home: "administration",
      permissions: ["enclosures.manage"],
    } as never;
    const allowed = getNavigationForProfile(profile).map(({ id, label, icon }) => ({ id, label, icon }));
    const ordered = orderSearchGroups([], "enclosures", allowed, "recin");

    expect(ordered).toHaveLength(1);
    expect(ordered[0].heading).toBe("Secciones");
    expect(ordered[0].results.map((r) => r.section)).toEqual(["enclosures"]);
    expect(orderSearchGroups([], "enclosures", allowed, "usuari")).toEqual([]);
    expect(orderSearchGroups(groups, null, sections, "x").filter((g) => g.key.startsWith("api-")).map((g) => g.key)).toEqual([
      "api-users",
      "api-enclosures",
      "api-tulanpedia",
    ]);
  });
});

describe("CA-26 enclosure-actions-global-search", () => {
  it("los filtros propios de Usuarios, Historial de boletos y Momentos siguen presentes", () => {
    expect(read("views/TicketHistoryView.tsx")).toContain("applyFilters");
    expect(read("views/UsersView.tsx")).toContain("rowKey");
    expect(read("views/MemoriesView.tsx")).toContain("memoryFilterOptions");
  });
});

describe("CA-27 enclosure-actions-global-search", () => {
  it(".search-box ocupa el 100 % a 640 px o menos y los estilos nuevos no fijan colores", () => {
    expect(styles).toMatch(/@media \(max-width: 640px\) \{\s*\.search-box,\s*\.dashboard-app--admin \.search-box \{\s*width: 100%;/);
    const block = styles.slice(styles.indexOf("dashboard-012 · acciones de recintos"));
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(block).not.toMatch(/rgba?\(/);
  });
});
