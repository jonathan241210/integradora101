const DEV_PORTAL_URL = 'http://localhost:8080';

export const PORTAL_ALERT_TITLE = 'Portal del zoológico';
export const PORTAL_LEAVE_MESSAGE = 'Estás a punto de salir de la app y abrir el portal del zoológico.';
export const PORTAL_MISSING_MESSAGE = 'No hay una dirección del portal configurada. No se puede abrir.';

export type PortalPage = 'noticias.html' | 'eventos.html';

/**
 * Arma la página del portal. Sin base configurada y fuera de desarrollo, no hay destino.
 * Cumple CA-03 y CA-08.
 */
export function resolvePortalPage(
  page: PortalPage,
  options?: { portalUrl?: string | null; allowDevFallback?: boolean },
): string | null {
  const configured = (options?.portalUrl ?? process.env.EXPO_PUBLIC_PORTAL_URL)?.trim() ?? '';
  const allowDev = options?.allowDevFallback ?? (typeof __DEV__ !== 'undefined' && __DEV__);
  const base = configured || (allowDev ? DEV_PORTAL_URL : '');
  if (!base) return null;
  return `${base.replace(/\/+$/, '')}/${page}`;
}
