import type { IconName } from "@/components/Icon";
import type { DashboardSection } from "./dashboard-shell";
import type { GlobalSearchGroup, GlobalSearchResponse } from "./admin-types";
import { pairedAction, rankActions, type SearchActionEntry } from "./search-actions";
import {
  STOP_WORDS,
  bestWordLevel,
  compareRelevance,
  highlightTolerant,
  relevanceOf,
  tokenize,
  type HighlightSegment,
  type Relevance,
} from "./search-tolerance";
import { detectSectionIntent } from "./search-intent";

export type { HighlightSegment };

/**
 * Buscador universal del encabezado (dashboard-012 CA-12 a CA-17, CA-25).
 * Funciones puras y un controlador sin React: solo presentan lo que devuelve
 * la API; los permisos y el orden de los datos los decide el servidor (RN-01).
 */
export const GLOBAL_SEARCH_MIN = 2;
export const GLOBAL_SEARCH_MAX = 100;
export const DEBOUNCE_MS = 300;

export const SEARCH_HINT = "Escribe al menos 2 caracteres.";
export const SEARCH_LOADING = "Buscando…";
export const SEARCH_ERROR = "No pudimos buscar. Inténtalo de nuevo.";
export const CURRENT_SECTION_HEADING = "En esta sección";
export const SECTIONS_HEADING = "Secciones";
export const ACTIONS_HEADING = "Acciones";

export const searchEmptyMessage = (text: string) => `No encontramos «${text}» en el panel.`;

export type SearchSectionInfo = { id: DashboardSection; label: string; icon: IconName };

/** Acción del catálogo vinculada a un resultado (CA-34, CA-35). */
export type SearchActionRef = Pick<SearchActionEntry, "id" | "label" | "opens" | "tab">;

export type SearchResult = {
  key: string;
  section: string;
  sectionLabel: string;
  icon: IconName;
  id: number | null;
  title: string;
  subtitle: string;
  kind?: "published-species" | "species-request";
  /** Fragmento de la coincidencia fuera del título (CA-29). */
  match?: { field: string; snippet: string };
  isSection: boolean;
  /** Entrada del grupo «Acciones»: sin elemento (CA-34, CA-36). */
  isAction?: boolean;
  /** En una acción, la propia; en un elemento, la de «Ir a: …» (CA-35). */
  action?: SearchActionRef;
};

export type SearchDisplayGroup = {
  key: string;
  heading: string;
  results: SearchResult[];
};

/** Minúsculas sin acentos, para comparar nombres de sección. */
export function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function canSearch(query: string): boolean {
  return query.trim().length >= GLOBAL_SEARCH_MIN;
}

/**
 * Grupos listos para pintar: la sección actual primero («En esta sección»),
 * los demás en el orden de la respuesta («En <Sección>») y las coincidencias
 * con nombres de sección permitidas al final («Secciones»). Sin grupos vacíos.
 */
export function orderSearchGroups(
  groups: GlobalSearchGroup[],
  currentSection: string | null,
  allowedSections: SearchSectionInfo[],
  query: string,
  options: { actions?: SearchActionEntry[]; pairing?: boolean } = {},
): SearchDisplayGroup[] {
  const actions = options.actions ?? [];
  // Enmienda (e): una palabra que ya aparece en resultados reales es parte de lo que se busca, no una
  // orden; las acciones solo se buscan con las palabras que no encontraron nada (ni vacías ni de sección).
  const resultWords = groups.flatMap((group) =>
    group.items.flatMap((item) => tokenize([item.title, item.subtitle ?? "", item.match?.snippet ?? ""].join(" "))),
  );
  // Un verbo de acción escrito de forma explícita («crear», «renombrar», «borrar»…) siempre cuenta,
  // aunque también aparezca en los resultados: el verbo inicial de una acción o un sinónimo en infinitivo.
  const explicitVerbs = new Set(
    actions.flatMap((entry) => [
      ...tokenize(entry.label).slice(0, 1),
      ...entry.synonyms.flatMap(tokenize).filter((word) => word.length >= 4 && /(ar|er|ir)$/.test(word)),
    ]).filter((word) => !["nueva", "precios", "qr"].includes(word)),
  );
  const actionQuery = tokenize(query)
    .filter((word) => !STOP_WORDS.has(word))
    .filter((word) => detectSectionIntent(word).sections.length === 0)
    .filter((word) => explicitVerbs.has(word) || bestWordLevel(word, resultWords) === 0)
    .join(" ");
  const rankedActions = actionQuery === "" ? [] : rankActions(actionQuery, actions);
  const iconOf = (section: string): IconName =>
    allowedSections.find((item) => item.id === section)?.icon ?? "search";
  const toGroup = (group: GlobalSearchGroup, heading: string): SearchDisplayGroup => ({
    key: `api-${group.section}`,
    heading,
    results: group.items.map((item) => {
      const paired = options.pairing ? pairedAction(actions, group.section, query) : null;

      return {
      key: `${group.section}:${item.kind ?? "item"}:${item.id}`,
      section: group.section,
      sectionLabel: group.label,
      icon: iconOf(group.section),
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      kind: item.kind,
      ...(item.match ? { match: item.match } : {}),
      ...(paired ? { action: toActionRef(paired) } : {}),
      isSection: false,
      };
    }),
  });
  const filled = groups.filter((group) => group.items.length > 0);
  // Si la consulta nombra una sección («noticia…», «evento…»), esa sección va primero.
  const intent = detectSectionIntent(query).sections;
  const intentRank = (section: string) => {
    const index = intent.indexOf(section);

    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const named = filled
    .filter((group) => intent.includes(group.section))
    .sort((a, b) => intentRank(a.section) - intentRank(b.section));
  const current = filled.filter((group) => group.section === currentSection && !intent.includes(group.section));
  // Enmienda (d), CA-42: los demás grupos por `best_score` descendente; empate, orden de navegación.
  const navigationIndex = (section: string) => {
    const index = allowedSections.findIndex((item) => item.id === section);

    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  const scoreOf = (group: GlobalSearchGroup) => {
    const score = (group as { best_score?: unknown }).best_score;

    return typeof score === "number" ? score : Number.NEGATIVE_INFINITY;
  };
  const others = filled
    .filter((group) => group.section !== currentSection && !intent.includes(group.section))
    .map((group, index) => ({ group, index }))
    .sort((a, b) => {
      const scoreA = scoreOf(a.group);
      const scoreB = scoreOf(b.group);

      if (scoreA !== scoreB) return scoreB > scoreA ? 1 : -1;

      return navigationIndex(a.group.section) - navigationIndex(b.group.section) || a.index - b.index;
    })
    .map((item) => item.group);
  const ordered = [
    ...named.map((group) => toGroup(group, group.section === currentSection ? CURRENT_SECTION_HEADING : `En ${group.label}`)),
    ...current.map((group) => toGroup(group, CURRENT_SECTION_HEADING)),
    ...others.map((group) => toGroup(group, `En ${group.label}`)),
  ];
  if (rankedActions.length > 0) {
    ordered.push({
      key: "actions",
      heading: ACTIONS_HEADING,
      results: rankedActions.map((entry) => {
        const info = allowedSections.find((item) => item.id === entry.section);

        return {
          key: `action:${entry.id}`,
          section: entry.section,
          sectionLabel: info?.label ?? entry.sectionLabel,
          icon: iconOf(entry.section),
          id: null,
          title: entry.label,
          subtitle: info?.label ?? entry.sectionLabel,
          isSection: false,
          isAction: true,
          action: toActionRef(entry),
        };
      }),
    });
  }

  const matches = canSearch(query)
    ? allowedSections
        .map((item, index) => ({ item, index, relevance: relevanceOf(query, item.label) }))
        .filter((entry): entry is { item: SearchSectionInfo; index: number; relevance: Relevance } => entry.relevance !== null)
        .sort((a, b) => compareRelevance(a.relevance, b.relevance) || a.index - b.index)
        .map((entry) => entry.item)
    : [];

  if (matches.length > 0) {
    ordered.push({
      key: "sections",
      heading: SECTIONS_HEADING,
      results: matches.map((item) => ({
        key: `section:${item.id}`,
        section: item.id,
        sectionLabel: item.label,
        icon: item.icon,
        id: null,
        title: item.label,
        subtitle: "Sección del panel",
        isSection: true,
      })),
    });
  }

  return ordered;
}

function toActionRef(entry: SearchActionEntry): SearchActionRef {
  return { id: entry.id, label: entry.label, opens: entry.opens, tab: entry.tab };
}

export function flattenResults(groups: SearchDisplayGroup[]): SearchResult[] {
  return groups.flatMap((group) => group.results);
}

/** Índice activo tras una tecla de flecha; sin resultados devuelve -1. */
export function nextActiveIndex(current: number, key: string, count: number): number {
  if (count <= 0) return -1;
  if (key === "ArrowDown") return current < 0 ? 0 : Math.min(current + 1, count - 1);
  if (key === "ArrowUp") return current <= 0 ? 0 : current - 1;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;

  return current;
}

/** Partes del texto con la coincidencia marcada según la regla tolerante (CA-30); se pintan con nodos de React. */
export function highlightSegments(text: string, term: string): HighlightSegment[] {
  return highlightTolerant(text, term);
}

export type GlobalSearchStatus = "idle" | "loading" | "ready" | "error";

export type GlobalSearchSnapshot = {
  query: string;
  status: GlobalSearchStatus;
  groups: GlobalSearchGroup[];
  /** Mensaje de la API cuando responde 429 (CA-39); sin él se usa el genérico. */
  errorMessage?: string;
};

/** ¿El error es el límite de peticiones (429) con mensaje de la API? */
export function rateLimitMessage(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const { status, message } = error as { status?: unknown; message?: unknown };

  return status === 429 && typeof message === "string" && message.trim() !== "" ? message : undefined;
}

/**
 * Controlador del buscador: espera 300 ms tras dejar de escribir, llama una
 * sola vez a `search(q)` y descarta las respuestas viejas. Sin historial ni
 * almacenamiento (RN-06).
 */
export function createGlobalSearchController(
  search: (q: string) => Promise<GlobalSearchResponse>,
  onChange: (snapshot: GlobalSearchSnapshot) => void,
  debounceMs = DEBOUNCE_MS,
  /** Consulta que se envía a la API; `null` = no llamar (CA-35). Por defecto, el texto tal cual. */
  resolveQuery: (query: string) => string | null = (query) => query.trim(),
) {
  let snapshot: GlobalSearchSnapshot = { query: "", status: "idle", groups: [] };
  let sequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const publish = (next: Partial<GlobalSearchSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    onChange(snapshot);
  };

  return {
    snapshot: () => snapshot,
    setQuery(raw: string) {
      const query = raw.slice(0, GLOBAL_SEARCH_MAX);

      clearTimeout(timer);
      sequence += 1;
      const mine = sequence;

      if (!canSearch(query)) {
        publish({ query, status: "idle", groups: [] });

        return;
      }

      const apiQuery = resolveQuery(query);

      if (apiQuery === null) {
        publish({ query, status: "ready", groups: [], errorMessage: undefined });

        return;
      }

      publish({ query, status: "loading", errorMessage: undefined });
      timer = setTimeout(() => {
        search(apiQuery).then(
          (response) => {
            if (mine === sequence) publish({ status: "ready", groups: response.groups });
          },
          (error: unknown) => {
            // Sin reintento automático (CA-39).
            if (mine === sequence) publish({ status: "error", groups: [], errorMessage: rateLimitMessage(error) });
          },
        );
      }, debounceMs);
    },
    reset() {
      clearTimeout(timer);
      sequence += 1;
      publish({ query: "", status: "idle", groups: [], errorMessage: undefined });
    },
    dispose() {
      clearTimeout(timer);
      sequence += 1;
    },
  };
}
