import { ApiMapRepository, CACHE_KEY_PATH_NODES } from '../src/repositories/apiMapRepository';
import { MemoryKeyValueStorage } from '../src/repositories/storage';
import type { HttpClient } from '@arca/api-client';

function client(get: jest.Mock): jest.Mocked<HttpClient> {
  return { request: jest.fn(), get, post: jest.fn(), delete: jest.fn(), setOnUnauthorized: jest.fn() } as unknown as jest.Mocked<HttpClient>;
}

describe('ApiMapRepository: formatos de respuesta, caché y peticiones simultáneas (mobile-007 CA-21, mobile-018 CA-02)', () => {
  it('acepta respuestas como arreglo sin envoltura data en recintos, lugares y nodos', async () => {
    const get = jest.fn(async (path: string) => {
      if (path === '/enclosures') return [];
      return [];
    });
    const repo = new ApiMapRepository(client(get), new MemoryKeyValueStorage());

    await expect(repo.getZooPlaces()).resolves.toEqual([]);
    await expect(repo.getPathNodes()).resolves.toEqual([]);
    await expect(repo.fetchAndCachePlaces()).resolves.toEqual(expect.any(Array));
  });

  it('trata una respuesta inesperada (ni arreglo ni data) como lista vacía', async () => {
    const get = jest.fn(async () => ({ unexpected: true }));
    const repo = new ApiMapRepository(client(get), new MemoryKeyValueStorage());

    await expect(repo.getZooPlaces()).resolves.toEqual([]);
    await expect(repo.getPathNodes()).resolves.toEqual([]);
  });

  it('comparte una sola petición cuando se piden los mismos datos a la vez', async () => {
    let release: (value: unknown) => void = () => {};
    const gate = new Promise((resolve) => { release = resolve; });
    const get = jest.fn(async () => { await gate; return { data: [] }; });
    const repo = new ApiMapRepository(client(get), new MemoryKeyValueStorage());

    const zoo = Promise.all([repo.getZooPlaces(), repo.getZooPlaces()]);
    const nodes = Promise.all([repo.getPathNodes(), repo.getPathNodes()]);
    const places = Promise.all([repo.fetchAndCachePlaces(), repo.fetchAndCachePlaces()]);
    release(undefined);
    await Promise.all([zoo, nodes, places]);

    expect(get.mock.calls.filter(([p]) => p === '/zoo-places')).toHaveLength(1);
    expect(get.mock.calls.filter(([p]) => p === '/path-nodes')).toHaveLength(1);
    expect(get.mock.calls.filter(([p]) => p === '/enclosures')).toHaveLength(1);
  });

  it('devuelve nodos en caché vencida mientras revalida en segundo plano', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem(CACHE_KEY_PATH_NODES, JSON.stringify({ data: [{ id: 'n1' }], cachedAt: 0, ttlMs: 1 }));
    const get = jest.fn(async () => { throw new Error('sin red'); });
    const repo = new ApiMapRepository(client(get), storage);

    await expect(repo.getPathNodes()).resolves.toEqual([{ id: 'n1' }]);
  });
});
