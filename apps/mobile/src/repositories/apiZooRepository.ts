import { createHttpClient, type HttpClient } from '@arca/api-client';
import { ZooEvent, News } from '../models';
import { ZooRepository } from './index';
import { ApiEventResponse, ApiNewsResponse, mapEventToZooEventModel, mapNewsToModel } from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CACHE_KEY_EVENTS_ALL = '@arca:cache:events_list';
const CACHE_KEY_EVENT_PREFIX = '@arca:cache:event:';
const CACHE_KEY_NEWS_ALL = '@arca:cache:news_list';
const CACHE_KEY_NEWS_PREFIX = '@arca:cache:news:';
const EVENTS_PATH = '/events?limit=3';
const NEWS_PATH = '/news?limit=3';

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
  async getNews(): Promise<News[]> {
    const cached = await this.readCache<News[]>(CACHE_KEY_NEWS_ALL);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      this.revalidateNews().catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheNews();
  }

  async refreshNewsAndEvents(): Promise<{ news: News[]; events: ZooEvent[] }> {
    const [news, events] = await Promise.all([
      this.fetchAndCacheNews(),
      this.fetchAndCacheEvents(),
    ]);
    return { news, events };
  }

  async getNewsById(id: string): Promise<News | null> {
    const cacheKey = `${CACHE_KEY_NEWS_PREFIX}${id}`;
    const cached = await this.readCache<News | null>(cacheKey);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return cached.data;
      }
      this.revalidateNewsById(id, cacheKey).catch(() => {});
      return cached.data;
    }

    return await this.fetchAndCacheNewsById(id, cacheKey);
  }

  private async fetchAndCacheEvents(): Promise<ZooEvent[]> {
    try {
      const response = await this.httpClient.get<{ data: ApiEventResponse[] }>(EVENTS_PATH);
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
    const response = await this.httpClient.get<{ data: ApiEventResponse[] }>(EVENTS_PATH);
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

  private async fetchAndCacheNews(): Promise<News[]> {
    try {
      const response = await this.httpClient.get<{ data: ApiNewsResponse[] | ApiNewsResponse | null }>(NEWS_PATH);
      const raw = response?.data;
      const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
      const list = items.map(mapNewsToModel);
      await this.writeCache(CACHE_KEY_NEWS_ALL, list);
      return list;
    } catch {
      const cached = await this.readCache<News[]>(CACHE_KEY_NEWS_ALL);
      if (cached) return cached.data;
      return [];
    }
  }

  private async revalidateNews(): Promise<void> {
    const response = await this.httpClient.get<{ data: ApiNewsResponse[] | ApiNewsResponse | null }>(NEWS_PATH);
    const raw = response?.data;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    await this.writeCache(CACHE_KEY_NEWS_ALL, items.map(mapNewsToModel));
  }

  private async fetchAndCacheNewsById(id: string, cacheKey: string): Promise<News | null> {
    try {
      const response = await this.httpClient.get<{ data: ApiNewsResponse }>(`/news/${id}`);
      if (!response?.data) return null;
      const news = mapNewsToModel(response.data);
      await this.writeCache(cacheKey, news);
      return news;
    } catch (error: any) {
      if (error?.status === 404) return null;
      const cached = await this.readCache<News | null>(cacheKey);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateNewsById(id: string, cacheKey: string): Promise<void> {
    try {
      const response = await this.httpClient.get<{ data: ApiNewsResponse }>(`/news/${id}`);
      if (response?.data) {
        await this.writeCache(cacheKey, mapNewsToModel(response.data));
      }
    } catch {
      // Ignorar fallo en background
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
