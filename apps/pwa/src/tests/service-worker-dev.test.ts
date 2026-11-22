import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from '@/offline/register-sw';

/** CA-15 offline-first-sync: en desarrollo no se registra el service worker y se retiran los previos. */
describe('CA-15 offline-first-sync service worker solo en producción', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubBrowser() {
    const unregister = vi.fn(async () => true);
    const register = vi.fn(async () => ({}));
    const deleteCache = vi.fn(async () => true);
    const listeners: Record<string, () => void> = {};
    vi.stubGlobal('navigator', {
      serviceWorker: { register, getRegistrations: vi.fn(async () => [{ unregister }]) },
    });
    vi.stubGlobal('caches', { keys: vi.fn(async () => ['arca-pwa-shell-v1', 'otro-cache']), delete: deleteCache });
    vi.stubGlobal('window', {
      caches: true,
      addEventListener: (name: string, fn: () => void) => {
        listeners[name] = fn;
      },
    });
    return { unregister, register, deleteCache, listeners };
  }

  it('en desarrollo retira los service workers y vacía solo los cachés arca-pwa-*', async () => {
    const browser = stubBrowser();
    registerServiceWorker(false);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(browser.register).not.toHaveBeenCalled();
    expect(browser.unregister).toHaveBeenCalledTimes(1);
    expect(browser.deleteCache).toHaveBeenCalledWith('arca-pwa-shell-v1');
    expect(browser.deleteCache).not.toHaveBeenCalledWith('otro-cache');
  });

  it('en producción registra /sw.js al cargar la página', () => {
    const browser = stubBrowser();
    registerServiceWorker(true);
    browser.listeners.load?.();

    expect(browser.register).toHaveBeenCalledWith('/sw.js');
    expect(browser.unregister).not.toHaveBeenCalled();
  });
});
