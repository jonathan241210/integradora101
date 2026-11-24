/**
 * Configuración de entorno del cliente móvil (mobile-018).
 * Centraliza la URL de la API y el interruptor de datos de demostración.
 */

/** URL local solo para desarrollo y pruebas. Un emulador Android la alcanza con `adb reverse tcp:8000 tcp:8000`. */
export const DEV_API_URL = 'http://localhost:8000/api/v1';

export const MISSING_API_URL_MESSAGE =
  'Falta la dirección de la API. Define EXPO_PUBLIC_API_URL con una URL https:// en la configuración del build.';

type Env = Record<string, string | undefined>;

function defaultIsDev(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/**
 * Devuelve la URL base de la API.
 * CA-02: nunca usa 10.0.2.2. En desarrollo y pruebas cae a la URL local; en producción falla con un mensaje claro.
 */
export const INSECURE_API_URL_MESSAGE = 'La dirección de la API debe usar HTTPS en producción.';

export function resolveApiBaseUrl(options?: { configured?: string | null; isDev?: boolean; env?: Env }): string {
  const env = options?.env ?? process.env;
  const configured = (options?.configured !== undefined ? options.configured : env.EXPO_PUBLIC_API_URL)?.trim() ?? '';
  const isDev = options?.isDev ?? (defaultIsDev() || env.NODE_ENV === 'test');
  if (configured) {
    // CA-01: en producción solo se acepta HTTPS.
    if (!isDev && !configured.toLowerCase().startsWith('https://')) throw new Error(INSECURE_API_URL_MESSAGE);
    return configured;
  }
  if (isDev) return DEV_API_URL;
  throw new Error(MISSING_API_URL_MESSAGE);
}

/**
 * CA-08: los mocks solo existen con EXPO_PUBLIC_USE_MOCKS=true o en el entorno de pruebas
 * (salvo que una prueba pida la API real con EXPO_PUBLIC_USE_API=true).
 */
export function isMockDataEnabled(env: Env = process.env): boolean {
  if (env.EXPO_PUBLIC_USE_MOCKS === 'true') return true;
  return env.NODE_ENV === 'test' && env.EXPO_PUBLIC_USE_API !== 'true';
}
