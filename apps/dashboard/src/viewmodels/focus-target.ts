import type { DashboardSection } from "./dashboard-shell";
import type { SearchResult } from "./global-search";
import type { TulanpediaTab } from "./tulanpedia-tab";

/**
 * Diálogo que una acción puede abrir desde un resultado (CA-37, CA-38).
 * Solo Usuarios, Recintos e Historial de boletos lo soportan; el resto lo ignora.
 */
export type FocusDialogAction =
  | "status"
  | "reset-password"
  | "reset-two-factor"
  | "delete"
  | "cancel"
  | "qr"
  | "qr-print"
  | "qr-regenerate";

/**
 * «QR del recinto» abre el diálogo; el término decide el foco (dashboard-013 CA-18):
 * «imprimir» → Imprimir, «regenerar» → Regenerar QR, el resto → vista del QR.
 */
export function qrFocusAction(text: string): "qr" | "qr-print" | "qr-regenerate" {
  const normalized = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  if (/\bimprimir\b/.test(normalized)) return "qr-print";
  if (/\bregenerar\b/.test(normalized)) return "qr-regenerate";

  return "qr";
}

/**
 * Elemento elegido en el buscador (dashboard-012 CA-18 a CA-24). Solo
 * decide navegar o ubicar: no modifica datos (RN-07).
 */
export type FocusTarget = {
  section: DashboardSection;
  id: number;
  kind?: "published-species" | "species-request";
  /** Diálogo por abrir en la vista (sin ejecutarlo) si la vista lo soporta (CA-37, CA-38). */
  action?: FocusDialogAction;
  /** Texto buscado, para la etiqueta y el aviso. */
  text: string;
  nonce: number;
};

export const HIT_DURATION_MS = 4000;
export const NOT_AVAILABLE_MESSAGE = "Ese elemento ya no está disponible.";

export type FocusAction = "navigate" | "locate-only";

export function resolveFocusAction(
  currentSection: DashboardSection | null,
  target: Pick<FocusTarget, "section">,
): FocusAction {
  return currentSection === target.section ? "locate-only" : "navigate";
}

/** TulanPedia: `kind` decide la pestaña (CA-18). */
export function tabForKind(kind: FocusTarget["kind"]): TulanpediaTab | null {
  if (kind === "published-species") return "published";
  if (kind === "species-request") return "requests";

  return null;
}

/** Valor del atributo `data-search-id` que llevan las tarjetas y filas localizables. */
export function searchIdOf(target: Pick<FocusTarget, "section" | "id" | "kind">): string {
  return target.section === "tulanpedia" && target.kind
    ? `tulanpedia:${target.kind}:${target.id}`
    : `${target.section}:${target.id}`;
}

export function hitMessage(text: string, sectionLabel: string): string {
  return `Mostrando «${text}» en ${sectionLabel}`;
}

export const hitBannerText = (text: string) => `Resultado de tu búsqueda: «${text}»`;

type Scheduler = (callback: () => void, ms: number) => unknown;

/**
 * Busca el elemento en el DOM mientras la lista carga; si no aparece pide una
 * recarga de la lista una vez y, si sigue sin aparecer, avisa (CA-24).
 */
export function locateElement<T>(options: {
  find: () => T | null;
  onFound: (element: T) => void;
  onReload: () => void;
  onMissing: () => void;
  /** Mientras la lista carga no se cuentan intentos: la API puede tardar varios segundos. */
  isLoading?: () => boolean;
  /** Tope absoluto de espera para no quedarse esperando una carga que nunca termina. */
  maxWaitMs?: number;
  schedule?: Scheduler;
  cancelSchedule?: (handle: unknown) => void;
  attempts?: number;
  intervalMs?: number;
}): () => void {
  const schedule = options.schedule ?? ((cb, ms) => setTimeout(cb, ms));
  const cancelSchedule = options.cancelSchedule ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));
  const attempts = options.attempts ?? 15;
  const interval = options.intervalMs ?? 100;
  let handle: unknown;
  let cancelled = false;
  let count = 0;
  let reloaded = false;
  let waited = 0;
  const maxWait = options.maxWaitMs ?? 30000;

  const tick = () => {
    if (cancelled) return;
    const element = options.find();

    if (element) {
      options.onFound(element);

      return;
    }

    waited += interval;
    if (options.isLoading?.() && waited < maxWait) {
      handle = schedule(tick, interval);

      return;
    }

    count += 1;
    if (count >= attempts) {
      if (reloaded) {
        options.onMissing();

        return;
      }
      reloaded = true;
      count = 0;
      options.onReload();
    }
    handle = schedule(tick, interval);
  };

  handle = schedule(tick, 0);

  return () => {
    cancelled = true;
    cancelSchedule(handle);
  };
}

export type SelectionPlan =
  | { type: "ignore" }
  /** Acción sin elemento o sección: solo cambia de sección (y de pestaña) sin diálogo (CA-36). */
  | { type: "section"; section: DashboardSection; tab: TulanpediaTab | null }
  /** Elemento: navegar si hace falta, ubicarlo y, si hay acción, abrir su diálogo (CA-37). */
  | { type: "focus"; target: FocusTarget; navigate: boolean };

/**
 * Decide qué hace elegir un resultado. Nunca ejecuta ni modifica datos: a lo
 * sumo pide abrir un diálogo que sigue exigiendo confirmación (RN-07, RN-13).
 */
export function resolveSelection(
  result: Pick<SearchResult, "section" | "id" | "kind" | "isSection" | "isAction" | "action">,
  context: {
    text: string;
    nonce: number;
    currentSection: DashboardSection | null;
    allowedSections: string[];
  },
): SelectionPlan {
  const section = result.section as DashboardSection;

  if (!context.allowedSections.includes(section)) return { type: "ignore" };

  if (result.isAction || result.isSection || result.id === null) {
    return { type: "section", section, tab: result.isAction ? result.action?.tab ?? null : null };
  }

  const target: FocusTarget = {
    section,
    id: result.id,
    kind: result.kind,
    text: context.text,
    nonce: context.nonce,
    ...(result.action?.opens
      ? { action: result.action.opens === "qr" ? qrFocusAction(context.text) : result.action.opens }
      : {}),
  };

  return { type: "focus", target, navigate: resolveFocusAction(context.currentSection, target) === "navigate" };
}
