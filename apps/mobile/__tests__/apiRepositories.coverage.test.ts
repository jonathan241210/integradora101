import type { HttpClient } from '@arca/api-client';
import { ApiAnimalRepository } from '../src/repositories/apiAnimalRepository';
import { ApiMapRepository } from '../src/repositories/apiMapRepository';
import { ApiZooRepository } from '../src/repositories/apiZooRepository';
import { MemoryKeyValueStorage, type KeyValueStorage } from '../src/repositories/storage';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import { mapSpeciesToAnimalModel, mapEventToZooEventModel } from '../src/repositories/mappers';

function client(get: jest.Mock = jest.fn()): jest.Mocked<HttpClient> {
  return {
    request: jest.fn(),
    get,
    post: jest.fn(),
    delete: jest.fn(),
    setOnUnauthorized: jest.fn(),
  } as unknown as jest.Mocked<HttpClient>;
}

function species(id = 1, name = 'Jaguar') {
  return {
    id,
    common_name: name,
    scientific_name: 'Panthera onca',
    category: 'mammal',
  };
}

function enclosure(id = 1, name = 'Felinos') {
  return { id, name, map_x: 0.5, map_y: 0.5, animals: [] };
}

function event(id = 1, name = 'Charla') {
  return { id, name, start_date: '2026-11-01', start_time: '12:30:00', location: 'Plaza' };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('mobile-011 CA-05: cobertura de ApiAnimalRepository', () => {
  let storage: MemoryKeyValueStorage;

  beforeEach(() => {
    storage = new MemoryKeyValueStorage();
  });

  it('usa la caché fresca, obtiene destacados y admite una respuesta sin arreglo data', async () => {
    const http = client(jest.fn().mockResolvedValue({ data: [species()] }));
    const repo = new ApiAnimalRepository(http, storage);
    const first = await repo.getAllAnimals();
    expect(first[0].commonName).toBe('Jaguar');
    expect(await repo.getAllAnimals()).toEqual(first);
    expect(await repo.getFeaturedAnimals()).toEqual(first.slice(0, 3));
    expect(http.get).toHaveBeenCalledTimes(1);

    const empty = new ApiAnimalRepository(
      client(jest.fn().mockResolvedValue({ data: null })),
      new MemoryKeyValueStorage(),
    );
    expect(await empty.fetchAndCacheAllAnimals()).toEqual([]);
  });

  it('retorna la caché obsoleta mientras revalida la lista y el detalle', async () => {
    const stale = { data: [mapSpeciesToAnimalModel(species(1, 'Anterior'))], cachedAt: Date.now() - 10, ttlMs: 0 };
    const detail = { data: mapSpeciesToAnimalModel(species(2, 'Anterior')), cachedAt: Date.now() - 10, ttlMs: 0 };
    await storage.setItem('@arca:cache:species_list', JSON.stringify(stale));
    await storage.setItem('@arca:cache:species:2', JSON.stringify(detail));
    const http = client(jest.fn()
      .mockResolvedValueOnce({ data: [species(1, 'Actualizado')] })
      .mockResolvedValueOnce({ data: { ...species(2, 'Actualizado'), id: 2 } }));
    const repo = new ApiAnimalRepository(http, storage);

    expect((await repo.getAllAnimals())[0].commonName).toBe('Anterior');
    expect((await repo.getAnimalById('2'))?.commonName).toBe('Anterior');
    await tick();

    expect(http.get).toHaveBeenCalledTimes(2);
    expect((await repo.getAllAnimals())[0].commonName).toBe('Actualizado');
    expect((await repo.getAnimalById('2'))?.commonName).toBe('Actualizado');
  });

  it('tolera caché corrupta y fallos de escritura, y propaga la falla de red sin caché', async () => {
    await storage.setItem('@arca:cache:species_list', '{invalid');
    const http = client(jest.fn().mockRejectedValue(new Error('offline')));
    const repo = new ApiAnimalRepository(http, storage);
    await expect(repo.getAllAnimals()).rejects.toThrow('offline');

    const brokenStorage: KeyValueStorage = {
      getItem: async () => null,
      setItem: async () => { throw new Error('disk full'); },
      removeItem: async () => undefined,
      clear: async () => undefined,
    };
    const withBrokenStorage = new ApiAnimalRepository(
      client(jest.fn().mockResolvedValue({ data: [species()] })),
      brokenStorage,
    );
    expect(await withBrokenStorage.getAllAnimals()).toHaveLength(1);
  });

  it('retorna null para respuestas vacías y 404, usa caché en error y revalida en background', async () => {
    const http = client(jest.fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 })));
    const repo = new ApiAnimalRepository(http, storage);
    expect(await repo.getAnimalById('1')).toBeNull();
    expect(await repo.getAnimalById('2')).toBeNull();
    let reads = 0;
    const fallbackStorage: KeyValueStorage = {
      getItem: async () => {
        reads += 1;
        return reads === 1 ? null : JSON.stringify({
          data: { id: '3', commonName: 'Guardado' },
          cachedAt: Date.now(),
          ttlMs: 10000,
        });
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
      clear: async () => undefined,
    };
    const fallbackRepo = new ApiAnimalRepository(
      client(jest.fn().mockRejectedValue(new Error('offline'))),
      fallbackStorage,
    );
    expect(await fallbackRepo.getAnimalById('3')).toMatchObject({ commonName: 'Guardado' });
    expect(reads).toBe(2);

    await storage.setItem('@arca:cache:species:3', JSON.stringify({
      data: { id: '3', commonName: 'Guardado' },
      cachedAt: Date.now(),
      ttlMs: 10000,
    }));

    const staleRepo = new ApiAnimalRepository(
      client(jest.fn().mockRejectedValue(new Error('offline'))),
      storage,
    );
    await storage.setItem('@arca:cache:species:4', JSON.stringify({
      data: { id: '4', commonName: 'Stale' },
      cachedAt: Date.now() - 100,
      ttlMs: 0,
    }));
    expect(await staleRepo.getAnimalById('4')).toMatchObject({ commonName: 'Stale' });
    await tick();
  });
});

describe('mobile-011 CA-05: cobertura de ApiMapRepository', () => {
  it('admite payload array, caché directa y cacheo sin interrumpir ante fallo de storage', async () => {
    const storage = new MemoryKeyValueStorage();
    const repo = new ApiMapRepository(client(jest.fn().mockResolvedValue([enclosure()])), storage);
    const places = await repo.getPlaces();
    expect(places.some((place) => place.id === '1')).toBe(true);
    expect(places.some((place) => place.kind === 'service')).toBe(true);

    const cachedStorage = new MemoryKeyValueStorage();
    await cachedStorage.setItem('@arca:map_places_cache', JSON.stringify(MOCK_MAP_PLACES));
    const cachedRepo = new ApiMapRepository(client(), cachedStorage);
    expect(await cachedRepo.getPlaces()).toEqual(MOCK_MAP_PLACES);

    const brokenStorage: KeyValueStorage = {
      getItem: async () => null,
      setItem: async () => { throw new Error('disk full'); },
      removeItem: async () => undefined,
      clear: async () => undefined,
    };
    expect(await new ApiMapRepository(
      client(jest.fn().mockResolvedValue({ data: [enclosure(2)] })),
      brokenStorage,
    ).getPlaces()).toEqual(expect.arrayContaining([expect.objectContaining({ id: '2' })]));
  });

  it('usa fixture offline, trata JSON inválido y conserva datos vencidos durante revalidación', async () => {
    const offline = new ApiMapRepository(
      client(jest.fn().mockRejectedValue(new Error('offline'))),
      new MemoryKeyValueStorage(),
    );
    expect(await offline.getPlaces()).toEqual(MOCK_MAP_PLACES);

    const storage = new MemoryKeyValueStorage();
    await storage.setItem('@arca:map_places_cache', '{bad');
    const fromNetwork = new ApiMapRepository(
      client(jest.fn().mockResolvedValue({ data: [enclosure(3)] })),
      storage,
    );
    expect(await fromNetwork.getPlaces()).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: '3' }),
    ]));

    await storage.setItem('@arca:map_places_cache', JSON.stringify({
      data: MOCK_MAP_PLACES,
      cachedAt: Date.now() - 100,
      ttlMs: 0,
    }));
    const staleHttp = client(jest.fn().mockResolvedValue({ data: [] }));
    const staleRepo = new ApiMapRepository(staleHttp, storage);
    expect(await staleRepo.getPlaces()).toEqual(MOCK_MAP_PLACES);
    await tick();
    expect(staleHttp.get).toHaveBeenCalledTimes(1);
  });
});

describe('mobile-011 CA-05: cobertura de ApiZooRepository', () => {
  it('CA-05 reutiliza eventos frescos y revalida lista y detalle vencidos', async () => {
    const storage = new MemoryKeyValueStorage();
    const envelope = (data: unknown) => JSON.stringify({data,cachedAt:0,ttlMs:0});
    await storage.setItem('@arca:cache:events_list',envelope([mapEventToZooEventModel(event(1,'Anterior'))]));
    await storage.setItem('@arca:cache:event:2',envelope(mapEventToZooEventModel(event(2,'Detalle anterior'))));
    const http = client(jest.fn().mockResolvedValueOnce({data:[event(1,'Actual')]}).mockResolvedValueOnce({data:event(2,'Detalle actual')}));
    const repo = new ApiZooRepository(http,storage);
    expect((await repo.getEvents())[0].title).toBe('Anterior');
    expect((await repo.getEventById('2'))?.title).toBe('Detalle anterior');
    await tick();
    expect((await repo.getEvents())[0].title).toBe('Actual');
    expect((await repo.getEventById('2'))?.title).toBe('Detalle actual');
    expect(http.get).toHaveBeenCalledTimes(2);
  });
  it('CA-05 tolera fallos de revalidación y una respuesta de detalle vacía', async () => {
    const storage = new MemoryKeyValueStorage();
    const http = client(jest.fn().mockResolvedValueOnce({data:[event()]}).mockRejectedValueOnce(new Error('offline')));
    const repo = new ApiZooRepository(http,storage,0);
    const initial = await repo.getEvents();
    expect(await repo.getEvents()).toEqual(initial);
    await tick();
    const detailClient = client(jest.fn().mockResolvedValueOnce({data:event()}).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({data:null}));
    const detailRepo = new ApiZooRepository(detailClient,storage,0);
    const saved = await detailRepo.getEventById('1');
    expect(await detailRepo.getEventById('1')).toEqual(saved);
    await tick();
    expect(await detailRepo.getEventById('missing')).toBeNull();
    const emptyHttp = client(jest.fn().mockResolvedValue({data:null}));
    const empty = new ApiZooRepository(emptyHttp,new MemoryKeyValueStorage(),0);
    expect(await empty.getEvents()).toEqual([]);
    expect(await empty.getEvents()).toEqual([]);
    await tick();
  });
  it('CA-05 conserva errores sin caché y tolera caché corrupta o disco lleno', async () => {
    const failure = new Error('offline');
    const failed = new ApiZooRepository(client(jest.fn().mockRejectedValue(failure)),new MemoryKeyValueStorage());
    await expect(failed.getEvents()).rejects.toBe(failure);
    await expect(failed.getEventById('1')).rejects.toBe(failure);
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('@arca:cache:events_list','not-json');
    const set = jest.spyOn(storage,'setItem').mockRejectedValue(new Error('disk full'));
    expect(await new ApiZooRepository(client(jest.fn().mockResolvedValue({data:[event()]})),storage).getEvents()).toHaveLength(1);
    set.mockRestore();
    let reads = 0;
    const fallback: KeyValueStorage = {
      getItem: async () => ++reads === 1 ? null : JSON.stringify({data:[],cachedAt:0,ttlMs:0}),
      setItem: async () => undefined, removeItem: async () => undefined, clear: async () => undefined,
    };
    expect(await new ApiZooRepository(client(jest.fn().mockRejectedValue(failure)),fallback).getEvents()).toEqual([]);
  });
  it('mapea eventos alternos, entrega detalle y maneja lista vacía', async () => {
    const http = client(jest.fn()
      .mockResolvedValueOnce({ data: [event()] })
      .mockResolvedValueOnce({ data: event(2, 'Detalle') })
      .mockResolvedValueOnce({ data: [] }));
    const repo = new ApiZooRepository(http, new MemoryKeyValueStorage());
    expect((await repo.getEvents())[0].title).toBe('Charla');
    expect((await repo.getEventById('2'))?.title).toBe('Detalle');
    expect(await new ApiZooRepository(http, new MemoryKeyValueStorage()).getEvents()).toEqual([]);
  });

  it('CA-08 mapea noticias y conserva la caché si la red falla', async () => {
    const http = client(jest.fn().mockResolvedValueOnce({
      data: [{ id: 9, titulo: 'Aviso', descripcion: 'Contenido', image_path: 'news/aviso.jpg' }],
    }));
    const repo = new ApiZooRepository(http, new MemoryKeyValueStorage(), 0);
    const first = await repo.getNews();
    expect(http.get).toHaveBeenCalledWith('/news?limit=3');
    expect(first[0]).toMatchObject({ id: '9', title: 'Aviso', body: 'Contenido' });
    expect(first[0].imageUrl).toBeUndefined();

    http.get.mockRejectedValueOnce(new Error('offline'));
    expect(await repo.getNews()).toEqual(first);

    const empty = new ApiZooRepository(
      client(jest.fn().mockResolvedValue({ data: null })),
      new MemoryKeyValueStorage(),
    );
    expect(await empty.getNews()).toEqual([]);
    const failed = new ApiZooRepository(
      client(jest.fn().mockRejectedValue(new Error('offline'))),
      new MemoryKeyValueStorage(),
    );
    expect(await failed.getNews()).toEqual([]);
  });

  it('retorna null ante 404 y usa una copia cacheada si falla la solicitud de detalle', async () => {
    const storage = new MemoryKeyValueStorage();
    const http = client(jest.fn()
      .mockRejectedValueOnce(Object.assign(new Error('missing'), { status: 404 })));
    const repo = new ApiZooRepository(http, storage);
    expect(await repo.getEventById('404')).toBeNull();
    let reads = 0;
    const fallbackStorage: KeyValueStorage = {
      getItem: async () => {
        reads += 1;
        return reads === 1 ? null : JSON.stringify({
          data: { id: '7', title: 'Guardado' },
          cachedAt: Date.now(),
          ttlMs: 10000,
        });
      },
      setItem: async () => undefined,
      removeItem: async () => undefined,
      clear: async () => undefined,
    };
    const fallbackRepo = new ApiZooRepository(
      client(jest.fn().mockRejectedValue(new Error('offline'))),
      fallbackStorage,
    );
    expect(await fallbackRepo.getEventById('7')).toMatchObject({ title: 'Guardado' });
  });
});
