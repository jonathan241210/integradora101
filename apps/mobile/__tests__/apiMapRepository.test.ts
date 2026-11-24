import { ApiMapRepository, CACHE_KEY_MAP_PLACES, CACHE_KEY_PATH_NODES, CACHE_KEY_ZOO_PLACES } from '../src/repositories/apiMapRepository';
import { MemoryKeyValueStorage } from '../src/repositories/storage';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import type { HttpClient } from '@arca/api-client';

describe('ApiMapRepository (mobile-007 Enmienda V4: api-enclosures-integration)', () => {
  let mockHttpClient: jest.Mocked<HttpClient>;
  let storage: MemoryKeyValueStorage;

  beforeEach(() => {
    storage = new MemoryKeyValueStorage();
    mockHttpClient = {
      request: jest.fn(),
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
      setOnUnauthorized: jest.fn(),
    };
  });

  it('CA-21 & RN-20: should fetch enclosures from /enclosures, map to MapPlace with explicit map coordinates and hide enclosures without map coordinates', async () => {
    const apiPayload = {
      data: [
        {
          id: 1,
          name: 'Aviario Principal',
          gps_lat: 20.08271,
          gps_lon: -98.36235,
          map_x: 0.15,
          map_y: 0.22,
          animals_count: 1,
          animals: [
            {
              id: 10,
              name: 'Paco',
              species_name: 'Guacamaya Roja',
            },
          ],
        },
        {
          id: 2,
          name: 'Herpetario',
          gps_lat: 20.0830,
          gps_lon: -98.7230,
          map_x: null,
          map_y: null,
          animals_count: 0,
          animals: [],
        },
      ],
    };

    mockHttpClient.get.mockResolvedValueOnce(apiPayload);
    const repository = new ApiMapRepository(mockHttpClient, storage);

    const places = await repository.getPlaces();

    expect(mockHttpClient.get).toHaveBeenCalledWith('/enclosures');

    // Debe contener los recintos mapeados más los servicios fijos (baños, comida, entrada)
    const aviario = places.find((p) => p.id === '1');
    expect(aviario).toBeDefined();
    expect(aviario?.name).toBe('Aviario Principal');
    expect(aviario?.kind).toBe('animal');
    expect(aviario?.mapX).toBe(0.15);
    expect(aviario?.mapY).toBe(0.22);
    expect(aviario?.gpsLat).toBe(20.08271);
    expect(aviario?.gpsLon).toBe(-98.36235);
    expect(aviario?.description).toContain('Paco');

    const herpetario = places.find((p) => p.id === '2');
    expect(herpetario).toBeDefined();
    expect(herpetario?.name).toBe('Herpetario');
    // Sin map_x/map_y no se renderiza en el mapa 2D
    expect(herpetario?.visible).toBe(false);

    // Debe preservar servicios esenciales
    const entrance = places.find((p) => p.kind === 'entrance');
    expect(entrance).toBeDefined();
  });

  it('CA-22: should persist places in storage under @arca:map_places_cache and recover offline', async () => {
    const apiPayload = {
      data: [
        {
          id: 99,
          name: 'Zona Felinos',
          gps_lat: 20.0815,
          gps_lon: -98.7210,
          map_x: 0.45,
          map_y: 0.55,
          animals: [],
        },
      ],
    };

    mockHttpClient.get.mockResolvedValueOnce(apiPayload);
    const onlineRepo = new ApiMapRepository(mockHttpClient, storage);
    const initialPlaces = await onlineRepo.getPlaces();

    // Validar que se persistió en la clave exigida
    const cachedRaw = await storage.getItem(CACHE_KEY_MAP_PLACES);
    expect(cachedRaw).not.toBeNull();
    expect(cachedRaw).toContain('Zona Felinos');

    // Ahora simular offline / caída de red en un nuevo repo compartiendo storage
    const offlineHttpClient: jest.Mocked<HttpClient> = {
      ...mockHttpClient,
      get: jest.fn().mockRejectedValue(new Error('Network request failed')),
    };

    const offlineRepo = new ApiMapRepository(offlineHttpClient, storage);
    const cachedPlaces = await offlineRepo.getPlaces();

    expect(offlineHttpClient.get).not.toHaveBeenCalled(); // Caché fresca
    expect(cachedPlaces).toEqual(initialPlaces);
    expect(cachedPlaces.some((p) => p.id === '99')).toBe(true);
  });

  it('CA-23: should gracefully fallback to MOCK_MAP_PLACES when first run is completely offline without cache', async () => {
    mockHttpClient.get.mockRejectedValueOnce(new Error('Offline'));
    const repository = new ApiMapRepository(mockHttpClient, storage);

    const places = await repository.getPlaces();

    expect(places).toEqual(MOCK_MAP_PLACES);
    expect(places.length).toBeGreaterThan(0);
  });

  it('should return zoo sections', async () => {
    const repository = new ApiMapRepository(mockHttpClient, storage);
    const sections = await repository.getSections();

    expect(sections).toEqual(MOCK_MAP_SECTIONS);
  });

  it('should fetch zoo places from /zoo-places and cache them', async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      data: [{ id: 10, name: 'Entrada', place_type: 'servicios', gps_lat: 20.1, gps_lon: -98.7, is_visible: true, description: 'Acceso' }],
    });
    const repo = new ApiMapRepository(mockHttpClient, storage);
    const places = await repo.getZooPlaces();
    expect(mockHttpClient.get).toHaveBeenCalledWith('/zoo-places');
    expect(places[0]).toMatchObject({ id: '10', name: 'Entrada', placeType: 'servicios', isVisible: true });
    const cachedRaw = await storage.getItem(CACHE_KEY_ZOO_PLACES);
    expect(cachedRaw).toContain('Entrada');
  });

  it('should return cached zoo places and fallback to empty array offline without cache', async () => {
    mockHttpClient.get.mockResolvedValueOnce({ data: [{ id: 11, name: 'Baños', place_type: 'servicios', is_visible: true }] });
    const repo = new ApiMapRepository(mockHttpClient, storage);
    const first = await repo.getZooPlaces();
    mockHttpClient.get.mockRejectedValueOnce(new Error('Offline'));
    const second = await repo.getZooPlaces();
    expect(second).toEqual(first);

    const offlineRepo = new ApiMapRepository({ ...mockHttpClient, get: jest.fn().mockRejectedValue(new Error('Offline')) }, new MemoryKeyValueStorage());
    expect(await offlineRepo.getZooPlaces()).toEqual([]);
  });

  it('should fetch path nodes from /path-nodes and cache them', async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      data: [{ id: 5, name: 'Cruce', node_type: 'interseccion', gps_lat: 20.1, gps_lon: -98.7 }],
    });
    const repo = new ApiMapRepository(mockHttpClient, storage);
    const nodes = await repo.getPathNodes();
    expect(mockHttpClient.get).toHaveBeenCalledWith('/path-nodes');
    expect(nodes[0]).toMatchObject({ id: '5', name: 'Cruce', nodeType: 'interseccion' });
    const cachedRaw = await storage.getItem(CACHE_KEY_PATH_NODES);
    expect(cachedRaw).toContain('Cruce');
  });

  it('should fallback to empty path nodes when offline without cache', async () => {
    mockHttpClient.get.mockRejectedValueOnce(new Error('Offline'));
    const repo = new ApiMapRepository(mockHttpClient, storage);
    expect(await repo.getPathNodes()).toEqual([]);
  });

  it('should return stale cache and revalidate in background for places, zoo places and path nodes', async () => {
    const stale = (data: unknown) => JSON.stringify({ data, cachedAt: Date.now() - 10 * 60 * 1000, ttlMs: 5 * 60 * 1000 });
    await storage.setItem(CACHE_KEY_MAP_PLACES, stale([{ id: '1', name: 'Aviario', kind: 'animal', mapX: 0.1, mapY: 0.2 }]));
    await storage.setItem(CACHE_KEY_ZOO_PLACES, stale([{ id: '10', name: 'Entrada', placeType: 'servicios', isVisible: true }]));
    await storage.setItem(CACHE_KEY_PATH_NODES, stale([{ id: '5', name: 'Cruce', nodeType: 'interseccion' }]));

    mockHttpClient.get.mockRejectedValue(new Error('Offline'));
    const repo = new ApiMapRepository(mockHttpClient, storage);
    const places = await repo.getPlaces();
    const zooPlaces = await repo.getZooPlaces();
    const pathNodes = await repo.getPathNodes();

    expect(places.some((p) => p.id === '1')).toBe(true);
    expect(zooPlaces[0]).toMatchObject({ id: '10' });
    expect(pathNodes[0]).toMatchObject({ id: '5' });
    await new Promise((r) => setTimeout(r, 0));
  });

  it('should handle invalid cache and direct-array responses', async () => {
    await storage.setItem(CACHE_KEY_ZOO_PLACES, 'not-json');
    await storage.setItem(CACHE_KEY_PATH_NODES, 'not-json');
    mockHttpClient.get
      .mockResolvedValueOnce([{ id: 20, name: 'Plaza', place_type: 'comun', is_visible: true }])
      .mockResolvedValueOnce([{ id: 30, name: 'Nodo', node_type: 'paso' }]);
    const repo = new ApiMapRepository(mockHttpClient, storage);
    expect((await repo.getZooPlaces())[0]).toMatchObject({ id: '20' });
    expect((await repo.getPathNodes())[0]).toMatchObject({ id: '30' });
  });
});
