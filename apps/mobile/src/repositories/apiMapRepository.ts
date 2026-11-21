import { createHttpClient, type HttpClient } from '@arca/api-client';
import { MapPlace, MapSection, PathNode, ZooPlace } from '../models';
import { MapRepository } from './index';
import {
  ApiEnclosureResponse,
  ApiPathNodeResponse,
  ApiZooPlaceResponse,
  mapEnclosureToMapPlace,
  mapPathNodeToModel,
  mapZooPlaceToModel,
} from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../mocks/zoo';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const DEFAULT_CACHE_TTL_MS = 30 * 1000; // 30 segundos para reflejar cambios rápidos en pruebas piloto
export const CACHE_KEY_MAP_PLACES = '@arca:map_places_cache';
export const CACHE_KEY_ZOO_PLACES = '@arca:zoo_places_cache';
export const CACHE_KEY_PATH_NODES = '@arca:path_nodes_cache';
const placeFlights = new Map<string, Promise<MapPlace[]>>();
const zooPlaceFlights = new Map<string, Promise<ZooPlace[]>>();
const pathNodeFlights = new Map<string, Promise<PathNode[]>>();

export class ApiMapRepository implements MapRepository {
  private readonly httpClient: HttpClient;
  private readonly storage: KeyValueStorage;
  private readonly defaultTtl: number;

  constructor(
    customClient?: HttpClient,
    customStorage: KeyValueStorage = defaultStorage,
    customTtl: number = DEFAULT_CACHE_TTL_MS
  ) {
    this.defaultTtl = customTtl;
    this.storage = customStorage;
    this.httpClient = customClient ?? createHttpClient({
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1',
    });
  }

  /**
   * Obtiene la lista de lugares del mapa (recintos y servicios) con estrategia SWR y caché offline.
   * Cumple con CA-21, CA-22 y CA-23.
   */
  async getPlaces(): Promise<MapPlace[]> {
    const cached = await this.readCache<MapPlace[]>(CACHE_KEY_MAP_PLACES);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      // Datos obsoletos: revalidar en segundo plano sin bloquear
      this.revalidatePlaces().catch(() => {});
      return cached.data;
    }

    try {
      return await this.fetchAndCachePlaces();
    } catch {
      // CA-23: En desconexión total sin caché previa, degradar graciosamente al fixture
      return MOCK_MAP_PLACES;
    }
  }

  /**
   * Obtiene las secciones/zonas temáticas del zoológico.
   */
  async getSections(): Promise<MapSection[]> {
    return Promise.resolve(MOCK_MAP_SECTIONS);
  }

  async getZooPlaces(): Promise<ZooPlace[]> {
    const cached = await this.readCache<ZooPlace[]>(CACHE_KEY_ZOO_PLACES);
    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) return cached.data;
      this.revalidateZooPlaces().catch(() => {});
      return cached.data;
    }
    try {
      return await this.fetchAndCacheZooPlaces();
    } catch {
      return [];
    }
  }

  async getPathNodes(): Promise<PathNode[]> {
    const cached = await this.readCache<PathNode[]>(CACHE_KEY_PATH_NODES);
    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) return cached.data;
      this.revalidatePathNodes().catch(() => {});
      return cached.data;
    }
    try {
      return await this.fetchAndCachePathNodes();
    } catch {
      return [];
    }
  }

  private async fetchAndCacheZooPlaces(): Promise<ZooPlace[]> {
    const pending = zooPlaceFlights.get(CACHE_KEY_ZOO_PLACES);
    if (pending) return pending;
    const flight = this.loadZooPlaces().finally(() => {
      if (zooPlaceFlights.get(CACHE_KEY_ZOO_PLACES) === flight) zooPlaceFlights.delete(CACHE_KEY_ZOO_PLACES);
    });
    zooPlaceFlights.set(CACHE_KEY_ZOO_PLACES, flight);
    return flight;
  }

  private async loadZooPlaces(): Promise<ZooPlace[]> {
    const response = await this.httpClient.get<{ data: ApiZooPlaceResponse[] } | ApiZooPlaceResponse[]>('/zoo-places');
    const items = Array.isArray((response as { data?: ApiZooPlaceResponse[] })?.data)
      ? (response as { data: ApiZooPlaceResponse[] }).data
      : (Array.isArray(response) ? response : []);
    const mapped = items.map(mapZooPlaceToModel);
    await this.writeCache(CACHE_KEY_ZOO_PLACES, mapped);
    return mapped;
  }

  private async revalidateZooPlaces(): Promise<void> {
    try { await this.fetchAndCacheZooPlaces(); } catch {}
  }

  private async fetchAndCachePathNodes(): Promise<PathNode[]> {
    const pending = pathNodeFlights.get(CACHE_KEY_PATH_NODES);
    if (pending) return pending;
    const flight = this.loadPathNodes().finally(() => {
      if (pathNodeFlights.get(CACHE_KEY_PATH_NODES) === flight) pathNodeFlights.delete(CACHE_KEY_PATH_NODES);
    });
    pathNodeFlights.set(CACHE_KEY_PATH_NODES, flight);
    return flight;
  }

  private async loadPathNodes(): Promise<PathNode[]> {
    const response = await this.httpClient.get<{ data: ApiPathNodeResponse[] } | ApiPathNodeResponse[]>('/path-nodes');
    const items = Array.isArray((response as { data?: ApiPathNodeResponse[] })?.data)
      ? (response as { data: ApiPathNodeResponse[] }).data
      : (Array.isArray(response) ? response : []);
    const mapped = items.map(mapPathNodeToModel);
    await this.writeCache(CACHE_KEY_PATH_NODES, mapped);
    return mapped;
  }

  private async revalidatePathNodes(): Promise<void> {
    try { await this.fetchAndCachePathNodes(); } catch {}
  }

  async fetchAndCachePlaces(): Promise<MapPlace[]> {
    const pending = placeFlights.get(CACHE_KEY_MAP_PLACES);
    if (pending) return pending;
    const flight = this.loadPlaces().finally(() => {
      if (placeFlights.get(CACHE_KEY_MAP_PLACES) === flight) placeFlights.delete(CACHE_KEY_MAP_PLACES);
    });
    placeFlights.set(CACHE_KEY_MAP_PLACES, flight);
    return flight;
  }

  private async loadPlaces(): Promise<MapPlace[]> {
    const response = await this.httpClient.get<{ data: ApiEnclosureResponse[] } | ApiEnclosureResponse[]>('/enclosures');
    const enclosures = Array.isArray((response as { data?: ApiEnclosureResponse[] })?.data)
      ? (response as { data: ApiEnclosureResponse[] }).data
      : (Array.isArray(response) ? response : []);

    const enclosurePlaces = enclosures.map(mapEnclosureToMapPlace);

    // Conservar los puntos de servicio y accesos (baños, comida, entrada)
    const servicePlaces = MOCK_MAP_PLACES.filter((p) => p.kind !== 'animal');
    const allPlaces = [...enclosurePlaces, ...servicePlaces];

    await this.writeCache(CACHE_KEY_MAP_PLACES, allPlaces);
    return allPlaces;
  }

  private async revalidatePlaces(): Promise<void> {
    try {
      await this.fetchAndCachePlaces();
    } catch (e) {
      // Falla silenciosa en revalidación background para no interrumpir al usuario
    }
  }

  private async readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
    try {
      const raw = await this.storage.getItem(key);
      if (!raw) return null;

      const parsed = JSON.parse(raw);

      // Si viene con envelope { data, cachedAt, ttlMs }
      if (parsed && typeof parsed === 'object' && 'data' in parsed && 'cachedAt' in parsed) {
        return parsed as CacheEnvelope<T>;
      }

      // Si fue guardado directamente como arreglo/objeto
      return {
        data: parsed as T,
        cachedAt: Date.now(),
        ttlMs: this.defaultTtl,
      };
    } catch {
      return null;
    }
  }

  private async writeCache<T>(key: string, data: T): Promise<void> {
    try {
      const envelope: CacheEnvelope<T> = {
        data,
        cachedAt: Date.now(),
        ttlMs: this.defaultTtl,
      };
      await this.storage.setItem(key, JSON.stringify(envelope));
    } catch {
      // Si el almacenamiento falla, continuamos sin romper el flujo
    }
  }
}
