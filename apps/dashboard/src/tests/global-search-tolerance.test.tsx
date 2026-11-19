import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GlobalSearch } from "../components/GlobalSearch";
import { highlightSegments, orderSearchGroups, type SearchSectionInfo } from "../viewmodels/global-search";
import { rankActions, type SearchActionEntry } from "../viewmodels/search-actions";
import { LEVEL_APPROX, LEVEL_CONTAINS, LEVEL_EXACT, LEVEL_PREFIX, compareRelevance, matchLevel, matchesActionWord, matchesTerm, relevanceOf, tokenize } from "../viewmodels/search-tolerance";
import type { GlobalSearchViewModel } from "../viewmodels/useGlobalSearch";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const marked = (text: string, term: string) =>
  highlightSegments(text, term).filter((segment) => segment.match).map((segment) => segment.text);

const sections: SearchSectionInfo[] = [
  { id: "users", label: "Usuarios", icon: "users" },
  { id: "enclosures", label: "Recintos", icon: "building" },
];

function view(groups: Parameters<typeof orderSearchGroups>[0], query: string): GlobalSearchViewModel {
  const display = orderSearchGroups(groups, null, sections, query);

  return {
    query,
    trimmedQuery: query,
    highlightTerm: query,
    status: "ready",
    groups: display,
    results: display.flatMap((group) => group.results),
    open: true,
    activeIndex: -1,
    actions: { change() {}, focus() {}, blur() {}, keyDown: () => false, choose() {}, hover() {} },
  };
}

describe("CA-29 enclosure-actions-global-search", () => {
  const withMatch = [
    {
      section: "users",
      label: "Usuarios",
      items: [{ id: 1, title: "Juan López", subtitle: "juan@zoo.test", match: { field: "Área", snippet: "Veterinaria general" } }],
    },
  ];

  it("muestra «campo: fragmento» con la coincidencia en <mark> bajo el título", () => {
    const markup = renderToStaticMarkup(<GlobalSearch {...view(withMatch, "veterinaria")} />);

    expect(markup).toContain('class="global-search__match"');
    expect(markup).toContain("Área: ");
    expect(markup).toContain("<mark>Veterinaria</mark> general");
  });

  it("sin match no aparece la línea y se pinta con nodos de React, no con innerHTML", () => {
    const plain = [{ section: "users", label: "Usuarios", items: [{ id: 1, title: "Juan", subtitle: "x" }] }];

    expect(renderToStaticMarkup(<GlobalSearch {...view(plain, "juan")} />)).not.toContain("global-search__match");
    expect(read("components/GlobalSearch.tsx")).not.toContain("innerHTML");
  });
});

describe("CA-30 enclosure-actions-global-search", () => {
  it("ignora mayúsculas y acentos", () => {
    expect(marked("Árbol Álamo", "alamo")).toEqual(["Álamo"]);
    expect(marked("ELEFANTE", "elefante")).toEqual(["ELEFANTE"]);
  });

  it("marca solo el prefijo o la parte contenida, y la palabra entera si es aproximada", () => {
    expect(marked("Elefante africano", "elef")).toEqual(["Elef"]);
    expect(marked("Pelobo", "lobo")).toEqual(["lobo"]);
    expect(marked("Lobo gris", "lovo")).toEqual(["Lobo"]);
  });

  it("no marca una palabra de menos de 4 letras por contiene ni por error", () => {
    expect(marked("Lobos", "os")).toEqual([]);
    expect(marked("Oso", "osa")).toEqual([]);
  });

  it("marca varias palabras y funciona en título, fragmento y nombre de sección", () => {
    expect(marked("Juan López Pérez", "lopez juan")).toEqual(["Juan", "López"]);
    const markup = renderToStaticMarkup(<GlobalSearch {...view([], "recint")} />);

    expect(markup).toContain("<mark>Recint</mark>os");
  });
});

describe("CA-31 enclosure-actions-global-search", () => {
  // Tabla de casos copiada de api-019 CA-36 a CA-40: [término, texto, coincide].
  const cases: Array<[string, string, boolean]> = [
    ["ÉLEFANTE", "Elefante", true],
    ["elefante", "Elefante", true],
    ["lopez juan", "Juan López Pérez", true],
    ["juan zebra", "Juan López Pérez", false],
    ["elef", "Elefante", true],
    ["lovo", "lobo", true],
    ["elefnte", "elefante", true],
    ["jrafa", "jirafa", true],
    ["osa", "oso", false],
    ["os", "lobos", false],
    ["obos", "lobos", true],
  ];

  it.each(cases)("«%s» contra «%s» da %s igual que la API", (term, text, expected) => {
    expect(matchesTerm(term, text)).toBe(expected);
  });

  it("la puntuación coincide con CA-41 de la API: exacta, prefijo, contiene y aproximada", () => {
    expect(matchLevel("lobo", "Lobo")).toBe(LEVEL_EXACT);
    expect(matchLevel("lobo", "Lobos")).toBe(LEVEL_PREFIX);
    expect(matchLevel("lobo", "Pelobo")).toBe(LEVEL_CONTAINS);
    expect(matchLevel("lobo", "Lovo")).toBe(LEVEL_APPROX);
    expect(tokenize("Niño Álamo")).toEqual(["nino", "alamo"]);
  });
});

describe("CA-41 enclosure-actions-global-search", () => {
  it("las secciones usan la regla tolerante: «recintoz» y «usuaros» las encuentran", () => {
    const headings = (query: string) =>
      orderSearchGroups([], null, sections, query).flatMap((group) => group.results.map((r) => r.title));

    expect(headings("recint")).toEqual(["Recintos"]);
    expect(headings("usuaros")).toEqual(["Usuarios"]);
    expect(headings("xyzw")).toEqual([]);
  });

  it("una palabra de acción: exacta o prefijo; con error solo desde 7 letras", () => {
    const clave = ["clave"];

    expect(matchesActionWord("clave", clave)).toBe(true);
    expect(matchesActionWord("cla", clave)).toBe(true);
    expect(matchesActionWord("clara", clave)).toBe(false);
    expect(matchesActionWord("clavs", clave)).toBe(false);
    expect(matchesActionWord("contrasna", tokenize("contraseña"))).toBe(true);
    expect(matchesActionWord("contrasena", ["contrasena"])).toBe(true);
    expect(matchesActionWord("restablcer", tokenize("restablecer"))).toBe(true);
    expect(matchesActionWord("ab", ["abrir"])).toBe(false);
  });
});

describe("CA-42 enclosure-actions-global-search", () => {
  const allowed: SearchSectionInfo[] = [
    { id: "users", label: "Usuarios", icon: "users" },
    { id: "enclosures", label: "Recintos", icon: "building" },
    { id: "news", label: "Noticias", icon: "search" },
    { id: "events", label: "Eventos", icon: "search" },
  ];
  const group = (section: string, label: string, best_score?: number) => ({
    section,
    label,
    items: [{ id: 1, title: "x", subtitle: "y" }],
    ...(best_score === undefined ? {} : { best_score }),
  });
  const headings = (groups: Parameters<typeof orderSearchGroups>[0], current: string | null, query = "x") =>
    orderSearchGroups(groups, current, allowed, query).map((item) => item.heading);

  it("sección actual primero, luego los demás por best_score descendente", () => {
    const groups = [group("users", "Usuarios", 3), group("news", "Noticias", 9), group("enclosures", "Recintos", 5)];

    expect(headings(groups, "enclosures")).toEqual(["En esta sección", "En Noticias", "En Usuarios"]);
  });

  it("el empate de best_score sigue el orden de navegación", () => {
    const groups = [group("events", "Eventos", 4), group("users", "Usuarios", 4), group("news", "Noticias", 4)];

    expect(headings(groups, null)).toEqual(["En Usuarios", "En Noticias", "En Eventos"]);
  });

  it("sin best_score (API anterior) conserva la navegación", () => {
    expect(headings([group("news", "Noticias"), group("users", "Usuarios")], null)).toEqual(["En Usuarios", "En Noticias"]);
  });

  it("«Acciones» y «Secciones» van al final, en ese orden", () => {
    const actions = [{ id: "users.create", label: "Crear usuario", section: "users", sectionLabel: "Usuarios", permission: "users.manage", opens: null, tab: null, synonyms: [], evidence: { file: "", text: "" } }] as Parameters<typeof orderSearchGroups>[4] extends infer O ? O extends { actions?: infer A } ? A : never : never;
    const result = orderSearchGroups([group("news", "Noticias", 1)], "users", allowed, "usuario", { actions });

    expect(result.map((item) => item.heading)).toEqual(["En Noticias", "Acciones", "Secciones"]);
  });
});

describe("CA-43 enclosure-actions-global-search", () => {
  it("exige ceil(n/2) palabras: todas con 1 o 2, la mitad redondeada hacia arriba con más", () => {
    expect(matchesTerm("juan zebra", "Juan López")).toBe(false);
    expect(matchesTerm("juan lopez zebra", "Juan López")).toBe(true);
    expect(matchesTerm("juan zebra tigre leon", "Juan López")).toBe(false);
    expect(matchesTerm("juan lopez tigre leon", "Juan López")).toBe(true);
    expect(matchesTerm("juan lopez tigre leon cebra", "Juan")).toBe(false);
    expect(matchesTerm("juan lopez tigre leon cebra", "Juan López Tigre")).toBe(true);
  });

  it("ordena por frase literal, frase en título, otro campo, palabras y nivel", () => {
    const rel = (term: string, title: string, others: string[] = []) => relevanceOf(term, title, others)!;

    expect(compareRelevance(rel("oso pardo", "Oso pardo"), rel("oso pardo", "Oso pardo andino"))).toBeLessThan(0);
    expect(compareRelevance(rel("oso pardo", "Oso pardo andino"), rel("oso pardo", "Zoo", ["Oso pardo"]))).toBeLessThan(0);
    expect(compareRelevance(rel("oso pardo", "Zoo", ["Oso pardo"]), rel("oso pardo", "Pardo y oso"))).toBeLessThan(0);
    expect(compareRelevance(rel("oso pardo tigre", "Oso pardo", ["Tigre"]), rel("oso pardo tigre", "Oso pardo"))).toBeLessThan(0);
    expect(compareRelevance(rel("lobo", "Lobo"), rel("lobo", "Lobos"))).toBeLessThan(0);
  });

  it("ordena «Secciones» por relevancia antes que por navegación", () => {
    const sectionList: SearchSectionInfo[] = [
      { id: "tickets", label: "Venta de boletos", icon: "search" },
      { id: "ticket-history", label: "Historial", icon: "search" },
      { id: "reports", label: "Boletos", icon: "search" },
    ];
    const result = orderSearchGroups([], null, sectionList, "boletos");

    expect(result[0].results.map((item) => item.section)).toEqual(["reports", "tickets"]);
  });

  it("ordena «Acciones» por relevancia y con una palabra basta y «borrar usuario» sigue mostrando «Eliminar cuenta»", () => {
    const entry = (id: string, label: string, synonyms: string[]) => ({
      id, label, section: "users", sectionLabel: "Usuarios", permission: "p", opens: null, tab: null, synonyms,
      evidence: { file: "", text: "" },
    }) as SearchActionEntry;
    const catalog = [entry("a", "Eliminar cuenta", ["borrar"]), entry("b", "Crear usuario", ["borrar usuario"]), entry("c", "Borrar usuario", [])];

    expect(rankActions("borrar usuario", catalog).map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(rankActions("borrar zzzz", catalog).map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(rankActions("zzzz yyyy", catalog)).toEqual([]);
  });
});

describe("CA-44 enclosure-actions-global-search", () => {
  it("marca todas las palabras que coincidieron, también con coincidencia parcial", () => {
    expect(marked("Oso pardo andino", "pardo oso")).toEqual(["Oso", "pardo"]);
    expect(marked("Oso pardo andino", "oso zebra pardo tigre")).toEqual(["Oso", "pardo"]);
  });
});
