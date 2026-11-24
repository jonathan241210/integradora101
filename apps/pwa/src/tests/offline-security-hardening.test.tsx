// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const store = vi.hoisted(() => {
  const names = ['meta', 'animalsCatalog', 'enclosuresCatalog', 'speciesCatalog', 'localAnimals', 'localEvaluations', 'outbox', 'idMap'];
  const data: Record<string, Row[]> = {};
  const db: Record<string, unknown> = {};
  for (const name of names) {
    data[name] = [];
    db[name] = {
      where: () => ({
        equals: (scope: string) => ({
          toArray: async () => data[name].filter((r) => r.userScope === scope),
          delete: async () => {
            data[name] = data[name].filter((r) => r.userScope !== scope);
          },
        }),
      }),
    };
  }
  return { data, db, names };
});

vi.mock('@/offline/db', () => ({ offlineDb: store.db }));

import { ApiError, createAnimalWithPhoto, uploadAnimalPhoto } from '@/services/apiClient';
import { clearUserOfflineData, countPendingOperations } from '@/offline/session-cleanup';
import {
  cleanupWarning,
  closeStaffSession,
  pendingOperationsBeforeLogout,
} from '@/viewmodels/useStaffSession';
import { LogoutConfirmDialog } from '@/views/LogoutConfirmDialog';

afterEach(() => {
  vi.unstubAllGlobals();
  for (const name of store.names) store.data[name] = [];
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf%2Dtoken' });
  return fetchMock;
}

describe('pwa-012 · fotos con CSRF', () => {
  it('CA-01 el alta con foto y el cambio de foto usan el cliente compartido con X-XSRF-TOKEN', async () => {
    const fetchMock = stubFetch(201, { data: { id: 1, photo_path: 'a.jpg' } });
    const form = new FormData();
    form.append('name', 'Jaguar');
    await createAnimalWithPhoto(form);
    await uploadAnimalPhoto(1, new File(['x'], 'a.jpg', { type: 'image/jpeg' }));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [, init] of fetchMock.mock.calls) {
      expect(init.method).toBe('POST');
      expect(init.credentials).toBe('include');
      expect(init.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
      expect(init.body).toBeInstanceOf(FormData);
    }
  });

  it('CA-02 conserva los mensajes en español de error al subir la foto', async () => {
    stubFetch(422, { message: 'La foto es demasiado grande.' });
    await expect(createAnimalWithPhoto(new FormData())).rejects.toMatchObject({ message: 'La foto es demasiado grande.', status: 422 });

    stubFetch(500, {});
    await expect(createAnimalWithPhoto(new FormData())).rejects.toThrow('No se pudo guardar el animal con foto.');

    stubFetch(404, {});
    const error = await uploadAnimalPhoto(1, new File(['x'], 'a.jpg')).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('La carga de foto desde el perfil aún no está disponible en el servidor.');

    stubFetch(500, {});
    await expect(uploadAnimalPhoto(1, new File(['x'], 'a.jpg'))).rejects.toThrow('No se pudo actualizar la foto del animal.');
  });
});

describe('pwa-012 · limpieza al cerrar sesión', () => {
  function seed() {
    for (const name of store.names) {
      store.data[name] = [{ userScope: 'user:1', id: `${name}-1` }, { userScope: 'user:2', id: `${name}-2` }];
    }
  }

  it('CA-03 borra los datos del usuario sin tocar los de otros', async () => {
    seed();
    store.data.outbox = [{ userScope: 'user:1', status: 'synced' }, { userScope: 'user:2', status: 'pending' }];
    expect(await countPendingOperations('user:1')).toBe(0);

    const auth = { login: vi.fn(), me: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) };
    const result = await closeStaffSession(auth, 'user:1');

    expect(result.session).toBe('anonymous');
    expect(result.error).toBe('');
    for (const name of store.names) {
      expect(store.data[name].some((r) => r.userScope === 'user:1')).toBe(false);
      expect(store.data[name].some((r) => r.userScope === 'user:2')).toBe(true);
    }
  });

  it('CA-03 si el borrado falla cierra la sesión igual con aviso', async () => {
    const auth = { login: vi.fn(), me: vi.fn(), logout: vi.fn().mockResolvedValue(undefined) };
    const result = await closeStaffSession(auth, 'user:1', async () => {
      throw new Error('fallo');
    });
    expect(auth.logout).toHaveBeenCalled();
    expect(result).toMatchObject({ session: 'anonymous', error: cleanupWarning });
  });

  it('CA-03 no borra nada si el servidor no confirma el cierre', async () => {
    seed();
    const auth = { login: vi.fn(), me: vi.fn(), logout: vi.fn().mockRejectedValue(new Error('red')) };
    const result = await closeStaffSession(auth, 'user:1');
    expect(result.session).toBe('authenticated');
    expect(store.data.outbox.some((r) => r.userScope === 'user:1')).toBe(true);
  });

  it('CA-04 informa cuántas operaciones pendientes hay y pide confirmar', async () => {
    store.data.outbox = [
      { userScope: 'user:1', status: 'pending' },
      { userScope: 'user:1', status: 'error' },
      { userScope: 'user:1', status: 'synced' },
      { userScope: 'user:2', status: 'pending' },
    ];
    expect(await pendingOperationsBeforeLogout('user:1')).toBe(2);

    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute('open', ''); };
    HTMLDialogElement.prototype.close = function close() { this.removeAttribute('open'); };
    const container = document.createElement('div');
    document.body.append(container);
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const root = createRoot(container);
    await act(async () => {
      root.render(<LogoutConfirmDialog pending={2} busy={false} onConfirm={onConfirm} onCancel={onCancel} />);
    });
    expect(container.textContent).toContain('Tienes 2 operaciones sin sincronizar.');
    const buttons = [...container.querySelectorAll('button')];
    expect(onConfirm).not.toHaveBeenCalled();
    await act(async () => {
      buttons.find((b) => b.textContent === 'Cerrar sesión y borrar')!.click();
    });
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await act(async () => root.unmount());
    container.remove();
  });

  it('CA-04 sin pendientes no pide confirmación y RN-02 no borra sin ella', async () => {
    store.data.outbox = [{ userScope: 'user:1', status: 'synced' }];
    expect(await pendingOperationsBeforeLogout('user:1')).toBe(0);
    store.data.outbox = [{ userScope: 'user:1', status: 'pending' }];
    // Solo el cierre confirmado llama a clearUserOfflineData; contar no borra.
    await countPendingOperations('user:1');
    expect(store.data.outbox).toHaveLength(1);
    await clearUserOfflineData('user:1');
    expect(store.data.outbox).toHaveLength(0);
  });
});

describe('pwa-012 · service worker', () => {
  function loadServiceWorker(cacheKeys: string[] = []) {
    const handlers: Record<string, (event: unknown) => void> = {};
    const put = vi.fn();
    const deleted: string[] = [];
    const openedNames: string[] = [];
    const caches = {
      open: vi.fn(async (name: string) => {
        openedNames.push(name);
        return { put, addAll: vi.fn(async () => undefined) };
      }),
      keys: vi.fn(async () => cacheKeys),
      delete: vi.fn(async (key: string) => {
        deleted.push(key);
        return true;
      }),
      match: vi.fn(async () => undefined),
    };
    const self = {
      location: { origin: 'https://zoo.test' },
      addEventListener: (name: string, fn: (event: unknown) => void) => {
        handlers[name] = fn;
      },
      skipWaiting: vi.fn(),
      clients: { claim: vi.fn(async () => undefined) },
    };
    let fetchResponse: unknown;
    const context = { self, caches, URL, fetch: vi.fn(async () => fetchResponse) };
    runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
    return {
      handlers, put, deleted, openedNames, caches,
      setResponse: (r: unknown) => { fetchResponse = r; },
    };
  }

  async function fetchThroughSw(sw: ReturnType<typeof loadServiceWorker>, path: string, response: { ok: boolean }) {
    sw.setResponse({ ...response, clone: () => response });
    let responded: Promise<unknown> | undefined;
    sw.handlers.fetch({
      request: { method: 'GET', url: `https://zoo.test${path}`, mode: 'cors' },
      respondWith: (p: Promise<unknown>) => { responded = p; },
    });
    if (responded) await responded;
    await new Promise((resolve) => setTimeout(resolve, 0));
    return responded !== undefined;
  }

  it('CA-05 no guarda en caché /storage, /api ni /sanctum', async () => {
    const sw = loadServiceWorker();
    for (const path of ['/storage/animals/foto.jpg', '/api/v1/staff/animals', '/sanctum/csrf-cookie']) {
      const handled = await fetchThroughSw(sw, path, { ok: true });
      expect(handled).toBe(false);
    }
    expect(sw.put).not.toHaveBeenCalled();
    expect(await fetchThroughSw(sw, '/assets/app.js', { ok: true })).toBe(true);
    expect(sw.put).toHaveBeenCalledTimes(1);
  });

  it('CA-06 no guarda respuestas que no son 2xx', async () => {
    const sw = loadServiceWorker();
    await fetchThroughSw(sw, '/assets/missing.js', { ok: false });
    expect(sw.put).not.toHaveBeenCalled();
  });

  it('CA-07 usa un nombre de caché nuevo y borra los anteriores al activarse', async () => {
    const sw = loadServiceWorker(['arca-pwa-shell-v1', 'arca-pwa-shell-v2']);
    let pending: Promise<unknown> | undefined;
    sw.handlers.activate({ waitUntil: (p: Promise<unknown>) => { pending = p; } });
    await pending;
    expect(sw.deleted).toEqual(['arca-pwa-shell-v1']);

    let installing: Promise<unknown> | undefined;
    sw.handlers.install({ waitUntil: (p: Promise<unknown>) => { installing = p; } });
    await installing;
    expect(sw.openedNames).toEqual(['arca-pwa-shell-v2']);
  });
});

describe('pwa-012 · estructura MVVM', () => {
  it('CA-08 las vistas no importan @/services/apiClient directamente', () => {
    for (const view of ['AnimalFormView', 'AnimalProfileView', 'DiagnosisIntenseView']) {
      const source = readFileSync(`src/views/${view}.tsx`, 'utf8');
      expect(source, view).not.toMatch(/from '@\/services\/apiClient'/);
      expect(source, view).toMatch(/@\/viewmodels\/useAnimalActions/);
    }
  });
});

describe('pwa-012 · estado retry de la sincronización', () => {
  it('trata retry como pendiente y no como rechazada (api-028)', async () => {
    const source = readFileSync('src/offline/sync-manager.ts', 'utf8');
    expect(source).toMatch(/result\.status === 'retry'[\s\S]{0,400}applyFailure\(item, userScope, message, true\)/);
  });
});
