import { resolveApiBaseUrl } from '../config/runtime';
import { createHttpClient, type HttpClient } from '@arca/api-client';
import { ZooEvent, News } from '../models';
import type { HomeListRefresh, ZooRepository } from './index';
import { ApiEventResponse, ApiNewsResponse, mapEventToZooEventModel, mapNewsToModel } from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';
import { retainMediaUri } from '../services/mediaImageCache';

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
      baseUrl: resolveApiBaseUrl(),
    });
  }

  /**
   * Obtiene la lista de eventos programados con estrategia SWR.
   * Cumple con CA-03 y CA-05.
   */
  async getEvents(onRevalidated?: (events: ZooEvent[]) => void): Promise<ZooEvent[]> {
    const cached = await this.readCache<ZooEvent[]>(CACHE_KEY_EVENTS_ALL);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return this.presentEvents(cached.data);
      }
      void this.revalidateEvents()
        .then((events) => onRevalidated ? this.presentEvents(events).then(onRevalidated) : undefined)
        .catch(() => {});
      return this.presentEvents(cached.data);
    }

    return this.presentEvents(await this.fetchAndCacheEvents());
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
        return this.presentEvent(cached.data);
      }
      this.revalidateEventById(id, cacheKey).catch(() => {});
      return this.presentEvent(cached.data);
    }

    return this.presentEvent(await this.fetchAndCacheEventById(id, cacheKey));
  }

  /**
   * Obtiene noticias destacadas del zoológico.
   */
  async getNews(onRevalidated?: (news: News[]) => void): Promise<News[]> {
    const cached = await this.readCache<News[]>(CACHE_KEY_NEWS_ALL);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return this.presentNewsList(cached.data);
      }
      void this.revalidateNews()
        .then((news) => onRevalidated ? this.presentNewsList(news).then(onRevalidated) : undefined)
        .catch(() => {});
      return this.presentNewsList(cached.data);
    }

    return this.presentNewsList(await this.fetchAndCacheNews());
  }

  async refreshNewsAndEvents(mode: HomeListRefresh = 'manual'): Promise<{ news: News[]; events: ZooEvent[] }> {
    const [news, events] = await Promise.all([
      this.refreshList(CACHE_KEY_NEWS_ALL, mode, () => this.fetchAndCacheNews(true)),
      this.refreshList(CACHE_KEY_EVENTS_ALL, mode, () => this.fetchAndCacheEvents()),
    ]);
    return {
      news: await this.presentNewsList(news, mode === 'manual'),
      events: await this.presentEvents(events, mode === 'manual'),
    };
  }

  private async refreshList<T>(key: string, mode: HomeListRefresh, fetchList: () => Promise<T>): Promise<T> {
    if (mode === 'stale') {
      const cached = await this.readCache<T>(key);
      if (cached && Date.now() - cached.cachedAt < cached.ttlMs) return cached.data;
    }
    return fetchList();
  }

  async getNewsById(id: string): Promise<News | null> {
    const cacheKey = `${CACHE_KEY_NEWS_PREFIX}${id}`;
    const cached = await this.readCache<News | null>(cacheKey);

    if (cached) {
      const isFresh = Date.now() - cached.cachedAt < cached.ttlMs;
      if (isFresh) {
        return this.presentNews(cached.data);
      }
      this.revalidateNewsById(id, cacheKey).catch(() => {});
      return this.presentNews(cached.data);
    }

    return this.presentNews(await this.fetchAndCacheNewsById(id, cacheKey));
  }

  async reloadNewsById(id: string): Promise<News | null> {
    return this.presentNews(await this.fetchAndCacheNewsById(id, `${CACHE_KEY_NEWS_PREFIX}${id}`), true);
  }

  private async fetchAndCacheEvents(): Promise<ZooEvent[]> {
    try {
      return await this.revalidateEvents();
    } catch (error) {
      const cached = await this.readCache<ZooEvent[]>(CACHE_KEY_EVENTS_ALL);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async revalidateEvents(): Promise<ZooEvent[]> {
    const response = await this.httpClient.get<{ data: ApiEventResponse[] }>(EVENTS_PATH);
    const list = Array.isArray(response?.data)
      ? response.data.map(mapEventToZooEventModel)
      : [];
    await this.writeCache(CACHE_KEY_EVENTS_ALL, list);
    return list;
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

  private async fetchAndCacheNews(propagateError = false): Promise<News[]> {
    try {
      return await this.revalidateNews();
    } catch (error) {
      const cached = await this.readCache<News[]>(CACHE_KEY_NEWS_ALL);
      if (cached) return cached.data;
      if (propagateError) throw error;
      return [];
    }
  }

  private async revalidateNews(): Promise<News[]> {
    const response = await this.httpClient.get<{ data: ApiNewsResponse[] | ApiNewsResponse | null }>(NEWS_PATH);
    const raw = response?.data;
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    const list = items.map(mapNewsToModel);
    await this.writeCache(CACHE_KEY_NEWS_ALL, list);
    return list;
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

  private async presentNewsList(list: News[], force = false): Promise<News[]> {
    const items = await Promise.all(list.map((item) => this.presentNews(item, force)));
    return items.filter((item): item is News => item !== null);
  }

  private async presentNews(item: News | null, force = false): Promise<News | null> {
    if (!item?.imageUrl || process.env.JEST_WORKER_ID) return item;
    const imageUrl = await retainMediaUri(item.imageUrl, force);
    return imageUrl === item.imageUrl ? item : { ...item, imageUrl };
  }

  private async presentEvents(list: ZooEvent[], force = false): Promise<ZooEvent[]> {
    const items = await Promise.all(list.map((item) => this.presentEvent(item, force)));
    return items.filter((item): item is ZooEvent => item !== null);
  }

  private async presentEvent(item: ZooEvent | null, force = false): Promise<ZooEvent | null> {
    if (!item?.imageUrls?.length || process.env.JEST_WORKER_ID) return item;
    const imageUrls = await Promise.all(item.imageUrls.map((uri) => retainMediaUri(uri, force)));
    return { ...item, imageUrls };
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
