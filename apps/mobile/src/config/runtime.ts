import Constants from 'expo-constants';

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
  // Expo sustituye referencias directas a EXPO_PUBLIC_* al generar el bundle.
  const apiUrl = options?.env ? options.env.EXPO_PUBLIC_API_URL : process.env.EXPO_PUBLIC_API_URL;
  const configured = (options?.configured !== undefined ? options.configured : apiUrl)?.trim() ?? '';
  const isDev = options?.isDev ?? (defaultIsDev() || (options?.env ?? process.env).NODE_ENV === 'test');
  if (configured) {
    const normalized = configured.toLowerCase();
    const allowsHttp = Constants.expoConfig?.extra?.allowCleartext === true && normalized.startsWith('http://');
    if (!isDev && !normalized.startsWith('https://') && !allowsHttp) throw new Error(INSECURE_API_URL_MESSAGE);
    return configured;
  }
  if (isDev) return DEV_API_URL;
  throw new Error(MISSING_API_URL_MESSAGE);
}

/**
 * CA-08: los mocks solo existen con EXPO_PUBLIC_USE_MOCKS=true o en el entorno de pruebas
 * (salvo que una prueba pida la API real con EXPO_PUBLIC_USE_API=true).
 */
export function isMockDataEnabled(env?: Env): boolean {
  const useMocks = env ? env.EXPO_PUBLIC_USE_MOCKS : process.env.EXPO_PUBLIC_USE_MOCKS;
  const useApi = env ? env.EXPO_PUBLIC_USE_API : process.env.EXPO_PUBLIC_USE_API;
  if (useMocks === 'true') return true;
  return (env ?? process.env).NODE_ENV === 'test' && useApi !== 'true';
}
