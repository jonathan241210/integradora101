const GENERIC_SERVER_MESSAGE = 'No pudimos completar la acción. Intenta de nuevo.';

const SERVER_LEAK = /sqlstate|sql syntax|queryexception|pdoexception|base table or view|unknown column|incorrect \w+ value|data truncated|integrity constraint/i;

/** Oculta el texto de un fallo de base de datos. Conserva los mensajes de validación. */
export function safeVisitorMessage(message: string, status?: number): string {
  const text = message.trim();
  if ((status != null && status >= 500) || SERVER_LEAK.test(text)) {
    return GENERIC_SERVER_MESSAGE;
  }
  return text || GENERIC_SERVER_MESSAGE;
}
