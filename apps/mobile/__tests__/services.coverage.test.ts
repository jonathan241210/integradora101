import * as repositories from '../src/repositories';
import { MemoryKeyValueStorage, defaultStorage } from '../src/repositories/storage';
import { syncZooData, LAST_SYNC_KEY } from '../src/services/zooSyncService';
import { createScanQueue } from '../src/services/scanQueue';
import { MOCK_ANIMALS, MOCK_MAP_PLACES } from '../src/mocks/zoo';

beforeEach(() => { jest.clearAllMocks(); });
afterEach(() => { jest.restoreAllMocks(); });

describe('mobile-011 CA-05: sincronización y errores de persistencia', () => {
  it('precarga las implementaciones API y persiste la fecha solo al completar ambas', async () => {
    const map = new repositories.ApiMapRepository();
    const animals = new repositories.ApiAnimalRepository();
    const fetchMap = jest.spyOn(map,'fetchAndCachePlaces').mockResolvedValue(MOCK_MAP_PLACES);
    const fetchAnimals = jest.spyOn(animals,'fetchAndCacheAllAnimals').mockResolvedValue(MOCK_ANIMALS);
    jest.spyOn(repositories,'createMapRepository').mockReturnValue(map);
    jest.spyOn(repositories,'createAnimalRepository').mockReturnValue(animals);
    const result = await syncZooData();
    expect(result).toMatchObject({ok:true,placesCount:MOCK_MAP_PLACES.length,animalsCount:MOCK_ANIMALS.length});
    expect(fetchMap).toHaveBeenCalledTimes(1); expect(fetchAnimals).toHaveBeenCalledTimes(1);
    expect(await defaultStorage.getItem(LAST_SYNC_KEY)).toBe(String(result.syncedAt));
  });
  it.each([new Error('sin conexión'),'fallo sin Error'])('devuelve diagnóstico sin guardar un éxito ficticio: %s', async cause => {
    const map = new repositories.ApiMapRepository();
    jest.spyOn(map,'fetchAndCachePlaces').mockRejectedValue(cause);
    jest.spyOn(repositories,'createMapRepository').mockReturnValue(map);
    const write = jest.spyOn(defaultStorage,'setItem');
    expect(await syncZooData()).toEqual({ok:false,placesCount:0,animalsCount:0,syncedAt:0,error:cause instanceof Error?cause.message:'Error desconocido al precargar datos'});
    expect(write).not.toHaveBeenCalled();
  });
  it('expone un fallo de disco y permite reintentar una sincronización posterior', async () => {
    jest.spyOn(defaultStorage,'setItem').mockRejectedValueOnce(new Error('disco lleno'));
    expect(await syncZooData()).toMatchObject({ok:false,error:'disco lleno'});
    expect(await syncZooData()).toMatchObject({ok:true});
  });
});

describe('mobile-011 CA-05: ramas de la cola de escaneos', () => {
  it('trata almacenamiento sin un arreglo como cola vacía y permite limpiar', async () => {
    const storage = new MemoryKeyValueStorage();
    await storage.setItem('visitor.scan-queue', JSON.stringify({invalid:true}));
    const queue = createScanQueue(storage);
    expect(await queue.list()).toEqual([]);
    expect(await queue.submit('ARCA-ONE')).toMatchObject({kind:'pending'});
    await queue.clear();
    expect(await queue.list()).toEqual([]);
  });
  it('propaga errores inesperados sin eliminar el escaneo', async () => {
    const failure = new Error('error del servidor');
    const queue = createScanQueue(new MemoryKeyValueStorage(), async () => { throw failure; });
    await expect(queue.submit('ARCA-ONE')).rejects.toBe(failure);
    expect(await queue.list()).toHaveLength(1);
  });
  it('conserva una presentación pendiente si otro consumidor vació la cola', async () => {
    const storage = new MemoryKeyValueStorage();
    jest.spyOn(storage,'getItem').mockResolvedValue(null);
    const queue = createScanQueue(storage);
    expect(await queue.submit('ARCA-ONE')).toMatchObject({kind:'pending'});
  });
  it('usa UUID del dispositivo cuando está disponible', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis,'crypto');
    const randomUUID = jest.fn(() => '00000000-0000-4000-8000-000000000001');
    Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID}});
    try {
      const queue = createScanQueue(new MemoryKeyValueStorage());
      expect((await queue.enqueue('ARCA-ONE')).clientScanId).toBe('00000000-0000-4000-8000-000000000001');
      expect(randomUUID).toHaveBeenCalledTimes(1);
    } finally {
      if(descriptor) Object.defineProperty(globalThis,'crypto',descriptor);
      else Reflect.deleteProperty(globalThis,'crypto');
    }
  });
});
