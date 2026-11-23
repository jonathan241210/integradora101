import type { AdminApi, ConsoleNoticeDto } from "./admin-types";
import { describeApiError } from "./api-errors";
import { formatDateTime } from "./formatters";

/**
 * Avisos de cambios de cuentas admin hechos por consola (dashboard-017 CA-10
 * a CA-13). Solo presenta lo que entrega la API: no traduce acciones ni decide
 * qué avisos existen. Desde la revisión 2026-11-21 los avisos salen como emergentes
 * de la cola de `DashboardNotifications` y se marcan como leídos al mostrarse.
 */

/** Permiso que habilita la consulta de avisos (CA-12); la API aplica el control real. */
export const CONSOLE_NOTICES_PERMISSION = "users.manage";

/** Antigüedad máxima de un aviso para mostrarse (dashboard-017 CA-20). */
export const CONSOLE_NOTICE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Máximo de avisos emergentes individuales; el resto se resume (CA-21). */
export const CONSOLE_NOTICE_MAX_SHOWN = 3;

/** Lo que el componente publica en la cola de avisos y marca como leído (CA-19). */
export type ConsoleAnnouncement = {
  nonce: number;
  /** Textos en orden de publicación (los más recientes primero, resumen al final). */
  messages: string[];
  /** Todos los avisos a marcar como leídos al mostrarse: mostrados, resumidos y antiguos. */
  readIds: number[];
};

export type ConsoleNoticesState = {
  /** `idle`: sin permiso o sin sesión; no se consulta nada. */
  status: "idle" | "loading" | "ready" | "error";
  announcement: ConsoleAnnouncement | null;
  /** Error de carga; se publica como aviso emergente de error (CA-25). */
  error: string;
};

export type ConsoleNoticesAction =
  | { type: "reset" }
  | { type: "load-started" }
  | { type: "loaded"; announcement: ConsoleAnnouncement | null }
  | { type: "failed"; message: string };

export type ConsoleNoticesDispatch = (action: ConsoleNoticesAction) => void;

export const initialConsoleNoticesState: ConsoleNoticesState = {
  status: "idle",
  announcement: null,
  error: "",
};

export function consoleNoticesReducer(
  state: ConsoleNoticesState,
  action: ConsoleNoticesAction,
): ConsoleNoticesState {
  switch (action.type) {
    case "reset":
      return initialConsoleNoticesState;
    case "load-started":
      return { ...state, status: "loading", error: "" };
    case "loaded":
      return { status: "ready", announcement: action.announcement, error: "" };
    case "failed":
      return { ...state, status: "error", error: action.message };
  }
}

/** CA-12: sin `users.manage` no se consulta ni se muestra nada. */
export function canSeeConsoleNotices(permissions: readonly string[]): boolean {
  return permissions.includes(CONSOLE_NOTICES_PERMISSION);
}

/** Texto exacto del aviso (CA-10). */
export function consoleNoticeText(notice: ConsoleNoticeDto): string {
  return `Cambio por consola: ${notice.action} en ${notice.account_email} el ${formatDateTime(notice.created_at)}. Motivo: ${notice.reason}.`;
}

/** Texto del resumen cuando hay más de tres avisos recientes (CA-21). */
export function consoleNoticesSummaryText(remaining: number): string {
  return remaining === 1
    ? "Y 1 cambio más por consola en los últimos días."
    : `Y ${remaining} cambios más por consola en los últimos días.`;
}

/**
 * Decide qué se muestra (CA-19 a CA-21): solo los de los últimos 7 días según
 * `created_at`, los 3 más recientes como avisos y el resto en un resumen. Todos
 * se marcan como leídos, también los antiguos, que no se muestran.
 */
export function planConsoleNotices(
  notices: readonly ConsoleNoticeDto[],
  now: number,
): { messages: string[]; readIds: number[] } {
  const time = (notice: ConsoleNoticeDto) => new Date(notice.created_at).getTime();
  const recent = notices
    .filter((notice) => {
      const at = time(notice);

      return Number.isNaN(at) || now - at <= CONSOLE_NOTICE_MAX_AGE_MS;
    })
    .sort((a, b) => (time(b) || 0) - (time(a) || 0));
  const messages = recent.slice(0, CONSOLE_NOTICE_MAX_SHOWN).map(consoleNoticeText);
  const remaining = recent.length - CONSOLE_NOTICE_MAX_SHOWN;

  if (remaining > 0) messages.push(consoleNoticesSummaryText(remaining));

  return { messages, readIds: notices.map((notice) => notice.id) };
}

export async function loadConsoleNotices(
  api: AdminApi,
  dispatch: ConsoleNoticesDispatch,
  isCurrent: () => boolean = () => true,
  now: number = Date.now(),
): Promise<void> {
  dispatch({ type: "load-started" });

  try {
    const notices = await api.consoleNotices.list();
    const plan = planConsoleNotices(notices, now);

    if (isCurrent()) {
      dispatch({
        type: "loaded",
        announcement: plan.readIds.length > 0 ? { nonce: 1, ...plan } : null,
      });
    }
  } catch (error) {
    const described = describeApiError(error);

    // El 401 lo atiende el estado de sesión (CA-16); no se duplica aquí.
    if (!isCurrent() || described.unauthorized) return;
    dispatch({
      type: "failed",
      message: described.forbidden
        ? "No fue posible consultar los avisos de consola."
        : `No fue posible consultar los avisos de consola. ${described.message}`,
    });
  }
}

/**
 * Marca los avisos como leídos al mostrarse (CA-19). Una sola llamada por aviso,
 * sin reintentos: si falla, el aviso saldrá de nuevo en el siguiente inicio de
 * sesión (CA-22). Un 401 lo atiende el estado de sesión.
 */
export async function markConsoleNoticesRead(
  api: AdminApi,
  ids: readonly number[],
): Promise<void> {
  await Promise.allSettled(ids.map((id) => api.consoleNotices.read(id)));
}

export type ConsoleNoticesViewModel = {
  state: ConsoleNoticesState;
  actions: {
    markRead: (ids: readonly number[]) => void;
  };
};
