import { createHttpClient, type HttpClient } from '@arca/api-client';
import { ZooEvent, News } from '../models';
import { ZooRepository } from './index';
import { ApiEventResponse, mapEventToZooEventModel } from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';
import { MOCK_NEWS } from '../mocks/zoo';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CACHE_KEY_EVENTS_ALL = '@arca:cache:events_list';
const CACHE_KEY_EVENT_PREFIX = '@arca:cache:event:';

export class ApiZooRepository implements ZooRepository {
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
   * Obtiene la lista de eventos programados con estrategia SWR.
   * Cumple con CA-03 y CA-05.
   */
  async getEvents(): Promise<ZooEvent[]> {
    const cached = await this.readCache<ZooEvent[]>(CACHE_KEY_EVENTS_ALL);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      this.revalidateEvents().catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheEvents();
  }

  /**
   * Obtiene el detalle de un evento individual por su ID.
   * Cumple con CA-03 y CA-05.
   */
  async getEventById(id: string): Promise<ZooEvent | null> {
    const cacheKey = `${CACHE_KEY_EVENT_PREFIX}${id}`;
    const cached = await this.readCache<ZooEvent | null>(cacheKey);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      this.revalidateEventById(id, cacheKey).catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheEventById(id, cacheKey);
  }

  /**
   * Obtiene noticias destacadas del zoológico.
   */
  async getNews(): Promise<News> {
    try {
      const response = await this.httpClient.get<{ data: any }>('/news');
      if (response?.data) {
        const item = Array.isArray(response.data) ? response.data[0] : response.data;
        if (item) {
          return {
            title: item.title || item.titulo || MOCK_NEWS.title,
            body: item.body || item.content || item.descripcion || MOCK_NEWS.body,
          };
        }
      }
      return MOCK_NEWS;
    } catch {
      return MOCK_NEWS;
    }
  }

  private async fetchAndCacheEvents(): Promise<ZooEvent[]> {
    try {
      const response = await this.httpClient.get<{ data: ApiEventResponse[] }>('/events');
      const list = Array.isArray(response?.data)
        ? response.data.map(mapEventToZooEventModel)
        : [];
      await this.writeCache(CACHE_KEY_EVENTS_ALL, list);
      return list;
    } catch (error) {
      const cached = await this.readCache<ZooEvent[]>(CACHE_KEY_EVENTS_ALL);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateEvents(): Promise<void> {
    const response = await this.httpClient.get<{ data: ApiEventResponse[] }>('/events');
    const list = Array.isArray(response?.data)
      ? response.data.map(mapEventToZooEventModel)
      : [];
    await this.writeCache(CACHE_KEY_EVENTS_ALL, list);
  }

  private async fetchAndCacheEventById(id: string, cacheKey: string): Promise<ZooEvent | null> {
    try {
      const response = await this.httpClient.get<{ data: ApiEventResponse }>(`/events/${id}`);
      if (!response?.data) return null;
      const event = mapEventToZooEventModel(response.data);
      await this.writeCache(cacheKey, event);
      return event;
    } catch (error: any) {
      if (error?.status === 404) {
        return null;
      }
      const cached = await this.readCache<ZooEvent | null>(cacheKey);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateEventById(id: string, cacheKey: string): Promise<void> {
    try {
      const response = await this.httpClient.get<{ data: ApiEventResponse }>(`/events/${id}`);
      if (response?.data) {
        const event = mapEventToZooEventModel(response.data);
        await this.writeCache(cacheKey, event);
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
      // Fallo de persistencia local no debe bloquear
    }
  }
}
