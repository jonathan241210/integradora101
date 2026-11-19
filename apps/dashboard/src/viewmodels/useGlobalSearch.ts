import { useEffect, useMemo, useRef, useState } from "react";
import { adminApi } from "@/services/arca-api";
import type { DashboardSection } from "./dashboard-shell";
import {
  createGlobalSearchController,
  flattenResults,
  nextActiveIndex,
  orderSearchGroups,
  type GlobalSearchSnapshot,
  type SearchDisplayGroup,
  type SearchResult,
  type SearchSectionInfo,
} from "./global-search";
import { splitSearchQuery, type SearchActionEntry } from "./search-actions";

const NO_ACTIONS: SearchActionEntry[] = [];

export type GlobalSearchViewStatus = "idle" | "loading" | "ready" | "empty" | "error";

export type GlobalSearchViewModel = {
  query: string;
  trimmedQuery: string;
  /** Término para resaltar títulos y fragmentos: el resto de la consulta sin palabras de acción (CA-30, CA-35). */
  highlightTerm?: string;
  /** Mensaje de la API ante un 429 (CA-39). */
  errorMessage?: string;
  status: GlobalSearchViewStatus;
  groups: SearchDisplayGroup[];
  results: SearchResult[];
  open: boolean;
  activeIndex: number;
  actions: {
    change: (value: string) => void;
    focus: () => void;
    blur: () => void;
    keyDown: (key: string) => boolean;
    choose: (result: SearchResult) => void;
    hover: (index: number) => void;
  };
};

/** ViewModel del buscador del encabezado (dashboard-012 CA-12 a CA-16). */
export function useGlobalSearch(options: {
  currentSection: DashboardSection | null;
  sections: SearchSectionInfo[];
  /** Acciones del catálogo que el perfil puede ver (CA-33). */
  actions?: SearchActionEntry[];
  onSelect: (result: SearchResult, text: string) => void;
}): GlobalSearchViewModel {
  const [snapshot, setSnapshot] = useState<GlobalSearchSnapshot>({ query: "", status: "idle", groups: [] });
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const controller = useRef<ReturnType<typeof createGlobalSearchController> | null>(null);
  const visibleActions = options.actions ?? NO_ACTIONS;
  const actionsRef = useRef(visibleActions);

  actionsRef.current = visibleActions;

  if (controller.current === null) {
    controller.current = createGlobalSearchController(
      (q) => adminApi.search(q),
      (next) => setSnapshot(next),
      undefined,
      (q) => splitSearchQuery(q, actionsRef.current).apiQuery,
    );
  }

  useEffect(() => () => controller.current?.dispose(), []);

  const split = useMemo(
    () => splitSearchQuery(snapshot.query, visibleActions),
    [snapshot.query, visibleActions],
  );
  const groups = useMemo(
    () =>
      snapshot.status === "ready"
        ? orderSearchGroups(snapshot.groups, options.currentSection, options.sections, snapshot.query, {
            actions: split.actions,
            pairing: split.pairing,
          })
        : [],
    [snapshot, options.currentSection, options.sections, split],
  );
  const results = useMemo(() => flattenResults(groups), [groups]);
  const trimmedQuery = snapshot.query.trim();
  const status: GlobalSearchViewStatus =
    snapshot.status === "ready" && results.length === 0 ? "empty" : snapshot.status;
  const open = focused && !dismissed && snapshot.query.length > 0;

  const choose = (result: SearchResult) => {
    options.onSelect(result, trimmedQuery);
    controller.current?.reset();
    setActiveIndex(-1);
    setDismissed(false);
  };

  return {
    query: snapshot.query,
    trimmedQuery,
    // Enmienda (e): se resalta con la consulta completa; solo se marcan las palabras que aparecen
    // en el texto (sin palabras vacías), así se ven todas las que coincidieron.
    highlightTerm: trimmedQuery,
    errorMessage: snapshot.errorMessage,
    status,
    groups,
    results,
    open,
    activeIndex,
    actions: {
      change: (value) => {
        setDismissed(false);
        setActiveIndex(-1);
        controller.current?.setQuery(value);
      },
      focus: () => {
        setFocused(true);
        setDismissed(false);
      },
      blur: () => setFocused(false),
      hover: (index) => setActiveIndex(index),
      choose,
      /** Devuelve `true` si la tecla se atendió y no debe seguir su efecto por defecto. */
      keyDown: (key) => {
        if (key === "ArrowDown" || key === "ArrowUp" || key === "Home" || key === "End") {
          if (!open || results.length === 0) {
            if (key === "ArrowDown" && snapshot.query.length > 0) setDismissed(false);

            return false;
          }
          setActiveIndex(nextActiveIndex(activeIndex, key, results.length));

          return true;
        }
        if (key === "Enter" && open && activeIndex >= 0 && results[activeIndex]) {
          choose(results[activeIndex]);

          return true;
        }
        if (key === "Escape" || key === "Tab") {
          setDismissed(true);
          setActiveIndex(-1);

          return key === "Escape";
        }

        return false;
      },
    },
  };
}
