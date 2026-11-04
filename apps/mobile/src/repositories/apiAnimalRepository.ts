import { createHttpClient, type HttpClient } from '@arca/api-client';
import { Animal } from '../models';
import { AnimalRepository } from './index';
import { ApiSpeciesResponse, mapSpeciesToAnimalModel } from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CACHE_KEY_ALL = '@arca:cache:species_list';
const CACHE_KEY_PREFIX = '@arca:cache:species:';

export class ApiAnimalRepository implements AnimalRepository {
  private readonly httpClient: HttpClient;
  private readonly storage: KeyValueStorage;
  private readonly defaultTtl: number;

  constructor(
    customClient?: HttpClient,
    customStorage: KeyValueStorage = defaultStorage,
    customTtl: number = FIVE_MINUTES_MS
  ) {
    this.defaultTtl = customTtl;
    this.storage = customStorage;
    this.httpClient = customClient ?? createHttpClient({
      baseUrl: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1',
    });
  }

  /**
   * Obtiene la lista completa de especies/animales con estrategia SWR.
   * Cumple con CA-01 y CA-05.
   */
  async getAllAnimals(): Promise<Animal[]> {
    const cached = await this.readCache<Animal[]>(CACHE_KEY_ALL);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      // Stale data: revalidar en segundo plano sin bloquear
      this.revalidateAllAnimals().catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheAllAnimals();
  }

  /**
   * Obtiene el detalle de una especie por ID con estrategia SWR.
   * Cumple con CA-02 y CA-05.
   */
  async getAnimalById(id: string): Promise<Animal | null> {
    const cacheKey = `${CACHE_KEY_PREFIX}${id}`;
    const cached = await this.readCache<Animal | null>(cacheKey);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      this.revalidateAnimalById(id, cacheKey).catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheAnimalById(id, cacheKey);
  }

  /**
   * Obtiene los animales destacados (primeras 3 especies).
   */
  async getFeaturedAnimals(): Promise<Animal[]> {
    const all = await this.getAllAnimals();
    return all.slice(0, 3);
  }

  private async fetchAndCacheAllAnimals(): Promise<Animal[]> {
    try {
      const response = await this.httpClient.get<{ data: ApiSpeciesResponse[] }>('/species');
      const list = Array.isArray(response?.data)
        ? response.data.map(mapSpeciesToAnimalModel)
        : [];
      await this.writeCache(CACHE_KEY_ALL, list);
      return list;
    } catch (error) {
      const cached = await this.readCache<Animal[]>(CACHE_KEY_ALL);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateAllAnimals(): Promise<void> {
    const response = await this.httpClient.get<{ data: ApiSpeciesResponse[] }>('/species');
    const list = Array.isArray(response?.data)
      ? response.data.map(mapSpeciesToAnimalModel)
      : [];
    await this.writeCache(CACHE_KEY_ALL, list);
  }

  private async fetchAndCacheAnimalById(id: string, cacheKey: string): Promise<Animal | null> {
    try {
      const response = await this.httpClient.get<{ data: ApiSpeciesResponse }>(`/species/${id}`);
      if (!response?.data) return null;
      const animal = mapSpeciesToAnimalModel(response.data);
      await this.writeCache(cacheKey, animal);
      return animal;
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      const cached = await this.readCache<Animal | null>(cacheKey);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateAnimalById(id: string, cacheKey: string): Promise<void> {
    try {
      const response = await this.httpClient.get<{ data: ApiSpeciesResponse }>(`/species/${id}`);
      if (response?.data) {
        const animal = mapSpeciesToAnimalModel(response.data);
        await this.writeCache(cacheKey, animal);
      }
    } catch {
      // Ignorar fallo en background
    }
  }

  private async readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
    try {
      const raw = await this.storage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as CacheEnvelope<T>;
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
      // Fallo de persistencia local no debe bloquear la app
    }
  }
}
