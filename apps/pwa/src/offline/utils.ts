export function nowIso(): string {
  return new Date().toISOString();
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function rawErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return '';
}

export function toUserSyncMessage(error: unknown, fallback = 'No se pudo completar la operación.'): string {
  const raw = rawErrorMessage(error).trim();
  if (!raw) return fallback;

  // Ocultar detalles técnicos de BD/infraestructura (SQLSTATE, consultas, host, etc.)
  if (/sqlstate|pdoexception|getaddrinfo|php_network_getaddresses|connection:\s*\w+|sql:\s*select|sql:\s*insert|sql:\s*update|sql:\s*delete|access denied for user|could not find driver/i.test(raw)) {
    return 'No se pudo conectar con el servidor en este momento. Se reintentará automáticamente cuando el servicio esté disponible.';
  }

  // Errores de red/navegador
  if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|the internet connection appears to be offline/i.test(raw) || error instanceof TypeError) {
    return 'Sin conexión o no se pudo contactar al servidor. Se reintentará automáticamente cuando haya internet.';
  }

  // Evitar exponer mensajes excesivamente técnicos/largos
  if (raw.length > 180 || /exception|stack trace|#0\s/i.test(raw)) {
    return fallback;
  }

  return raw;
}

export function toErrorMessage(error: unknown): string {
  return toUserSyncMessage(error, 'No se pudo completar la operación.');
}

export function isTemporarySyncFailure(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status;
    return status === 0 || status === undefined || (typeof status === 'number' && status >= 500);
  }
  return false;
}

export function backoffMs(attempts: number): number {
  const schedule = [5000, 15000, 30000, 60000, 300000];
  if (attempts <= 0) return schedule[0];
  if (attempts <= schedule.length) return schedule[attempts - 1];
  return 15 * 60 * 1000;
}