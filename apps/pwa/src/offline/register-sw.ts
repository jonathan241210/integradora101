/// <reference types="vite/client" />
/**
 * Registra el service worker solo en producción. En desarrollo (Vite) los módulos
 * se sirven sin hash, y el caché «cache first» de `sw.js` entregaría código viejo
 * tras cada cambio (p. ej. un envío sin un campo nuevo). Por eso en desarrollo se
 * retira cualquier service worker previo y se vacían sus cachés.
 */
export function registerServiceWorker(isProduction: boolean = import.meta.env.PROD): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  if (!isProduction) {
    void unregisterDevServiceWorkers();
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registro best-effort; la app sigue funcionando online.
    });
  });
}

async function unregisterDevServiceWorkers(): Promise<void> {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('arca-pwa-')).map((key) => caches.delete(key)));
    }
  } catch {
    // Sin permisos o sin soporte: no bloquea el arranque en desarrollo.
  }
}
