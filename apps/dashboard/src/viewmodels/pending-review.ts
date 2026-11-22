import type { PendingReviewCountsDto } from "@arca/api-client";
import type { DashboardSection } from "./dashboard-shell";
import type { ReportTabId } from "./report-tabs";

/**
 * Avisos de pendientes de revisión (dashboard-018). Solo presenta los dos
 * enteros que decide la API (api-024, api-027, RN-01): no calcula pendientes.
 */
export type PendingKey = "species_requests" | "memories" | "cancellation_days";

export type PendingCounts = Partial<Record<PendingKey, number>>;

export type PendingCountsApi = { pendingCounts(): Promise<PendingReviewCountsDto> };

/** Intervalo mínimo entre consultas con éxito (RN-07, CA-16). */
export const PENDING_MIN_INTERVAL_MS = 15_000;

const permissionByKey: Record<PendingKey, string> = {
  species_requests: "species.review",
  memories: "memories.review",
  cancellation_days: "reports.cancellations.view",
};

const keyBySection: Partial<Record<DashboardSection, PendingKey>> = {
  memories: "memories",
  tulanpedia: "species_requests",
  // dashboard-021 CA-11: el puntito de cancelaciones va en «Reportes».
  reports: "cancellation_days",
};

/** Claves que el perfil puede ver; vacío = no se consulta (RN-02, CA-11). */
export function pendingKeysFor(permissions: readonly string[]): PendingKey[] {
  return (Object.keys(permissionByKey) as PendingKey[]).filter((key) =>
    permissions.includes(permissionByKey[key]),
  );
}

export function canSeePendingCounts(permissions: readonly string[]): boolean {
  return pendingKeysFor(permissions).length > 0;
}

export function sectionPendingKey(section: DashboardSection): PendingKey | null {
  return keyBySection[section] ?? null;
}

/** RN-04: puntito si el último conteo de la clave es mayor que 0. */
export function hasPending(counts: PendingCounts, key: PendingKey | null): boolean {
  return key !== null && (counts[key] ?? 0) > 0;
}

export function sectionHasPending(counts: PendingCounts, section: DashboardSection): boolean {
  return hasPending(counts, sectionPendingKey(section));
}

const accessibleSuffix: Record<PendingKey, string> = {
  species_requests: "con solicitudes pendientes",
  memories: "con momentos pendientes de revisión",
  cancellation_days: "con días de cancelaciones pendientes de revisión",
};

/** dashboard-021 CA-11: la pestaña «Cancelaciones» lleva el mismo puntito que «Reportes». */
export function reportTabHasPending(counts: PendingCounts, tab: ReportTabId): boolean {
  return tab === "cancellations" && hasPending(counts, "cancellation_days");
}

export function reportTabAccessibleName(label: string, tab: ReportTabId, counts: PendingCounts): string {
  return reportTabHasPending(counts, tab) ? `${label}, con días pendientes de revisión` : label;
}

/** CA-09: sin pendientes, solo el nombre de la sección. */
export function sectionAccessibleName(
  label: string,
  section: DashboardSection,
  counts: PendingCounts,
): string {
  const key = sectionPendingKey(section);

  return key !== null && hasPending(counts, key) ? `${label}, ${accessibleSuffix[key]}` : label;
}

/** Textos aprobados (CA-01, CA-03). */
export function pendingNoticeText(key: PendingKey, count: number): string {
  if (key === "species_requests") {
    return count === 1
      ? "Tienes 1 solicitud de especie pendiente."
      : `Tienes ${count} solicitudes de especies pendientes.`;
  }

  if (key === "cancellation_days") {
    return count === 1
      ? "Tienes 1 día de cancelaciones en Atención sin revisar."
      : `Tienes ${count} días de cancelaciones en Atención sin revisar.`;
  }

  return count === 1
    ? "Tienes 1 momento pendiente de revisión."
    : `Tienes ${count} momentos pendientes de revisión.`;
}

/** Un aviso por cada tipo con pendientes (CA-01, CA-02). */
export function pendingNoticeMessages(counts: PendingCounts): string[] {
  return (["species_requests", "memories", "cancellation_days"] as PendingKey[])
    .filter((key) => hasPending(counts, key))
    .map((key) => pendingNoticeText(key, counts[key] as number));
}

/** RN-07: solo cuenta la última consulta con éxito. */
export function isPendingQueryDue(lastLoadedAt: number | null, now: number): boolean {
  return lastLoadedAt === null || now - lastLoadedAt >= PENDING_MIN_INTERVAL_MS;
}

export type PendingAnnouncement = { nonce: number; messages: string[] };

export type PendingReviewState = {
  counts: PendingCounts;
  /** Ya se resolvió el aviso de este inicio (RN-03, CA-04). */
  announced: boolean;
  announcement: PendingAnnouncement | null;
};

export const initialPendingReviewState: PendingReviewState = {
  counts: {},
  announced: false,
  announcement: null,
};

export type PendingReviewAction =
  | { type: "reset" }
  | { type: "loaded"; counts: PendingCounts };

export function pendingReviewReducer(
  state: PendingReviewState,
  action: PendingReviewAction,
): PendingReviewState {
  if (action.type === "reset") return initialPendingReviewState;
  if (state.announced) return { ...state, counts: action.counts };

  const messages = pendingNoticeMessages(action.counts);

  return {
    counts: action.counts,
    announced: true,
    announcement: messages.length > 0 ? { nonce: 1, messages } : null,
  };
}

function sanitize(dto: PendingReviewCountsDto | null | undefined, keys: PendingKey[]): PendingCounts {
  const counts: PendingCounts = {};

  for (const key of keys) {
    const value = dto?.[key];
    if (typeof value === "number" && Number.isFinite(value) && value > 0) counts[key] = Math.floor(value);
    else if (typeof value === "number") counts[key] = 0;
  }

  return counts;
}

/** Memoria de la consulta (no se persiste; vive durante la sesión). */
export type PendingQueryMemo = { lastLoadedAt: number | null; inFlight: boolean };

export function createPendingQueryMemo(): PendingQueryMemo {
  return { lastLoadedAt: null, inFlight: false };
}

/**
 * Consulta los conteos si hay permiso, ha pasado el intervalo mínimo y no hay
 * otra consulta en curso. Un fallo no muestra nada, no reintenta y no cuenta
 * para el intervalo (CA-10, RN-07).
 */
export async function refreshPendingCounts(
  api: PendingCountsApi,
  memo: PendingQueryMemo,
  dispatch: (action: PendingReviewAction) => void,
  options: { permissions: readonly string[]; now: number; isCurrent?: () => boolean },
): Promise<void> {
  const keys = pendingKeysFor(options.permissions);
  if (keys.length === 0 || memo.inFlight || !isPendingQueryDue(memo.lastLoadedAt, options.now)) return;

  memo.inFlight = true;
  try {
    const dto = await api.pendingCounts();
    if (options.isCurrent && !options.isCurrent()) return;
    memo.lastLoadedAt = options.now;
    dispatch({ type: "loaded", counts: sanitize(dto, keys) });
  } catch {
    // Silencioso: el panel sigue usable y la siguiente pantalla reintenta (CA-10).
  } finally {
    memo.inFlight = false;
  }
}
