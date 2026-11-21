import { createHttpClient, type HttpClient } from '@arca/api-client';
import { Animal } from '../models';
import { AnimalRepository } from './index';
import { ApiSpeciesResponse, mapSpeciesToAnimalModel, resolveUsableImageUrl } from './mappers';
import { KeyValueStorage, defaultStorage } from './storage';

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  ttlMs: number;
}

interface VisitorCatalog {
  ids: string[];
  images: Partial<Record<string, string>>;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;
const CACHE_KEY_ALL = '@arca:cache:species_list_v2';
const LEGACY_CACHE_KEY_ALL = '@arca:cache:species_list';
const CACHE_KEY_VISIBLE = '@arca:cache:visitor_catalog';
const LEGACY_CACHE_KEY_VISIBLE = '@arca:cache:visitor_species_ids';
const CACHE_KEY_PREFIX = '@arca:cache:species:';
const listFlights = new Map<string, Promise<Animal[]>>();

function rowsOf(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object' && 'data' in body) {
    const data = (body as { data?: unknown }).data;
    return Array.isArray(data) ? data : [];
  }
  return [];
}

/**
 * Species the visitor may see: published, and at least one animal open to visits.
 * Publication comes from GET /published-species. Visit access comes from GET /enclosures.
 */
export function visitorSpeciesIds(publishedBody: unknown, enclosuresBody: unknown): Set<string> {
  const publishedIds = new Set<string>();
  for (const row of rowsOf(publishedBody)) {
    if (!row || typeof row !== 'object' || !('id' in row)) continue;
    const id = String((row as { id?: unknown }).id ?? '');
    if (/^\d+$/.test(id)) publishedIds.add(id);
  }

  const visible = new Set<string>();
  for (const enclosure of rowsOf(enclosuresBody)) {
    if (!enclosure || typeof enclosure !== 'object' || !('animals' in enclosure)) continue;
    const animals = (enclosure as { animals?: unknown }).animals;
    if (!Array.isArray(animals)) continue;
    for (const animal of animals) {
      if (!animal || typeof animal !== 'object') continue;
      const record = animal as { species_id?: unknown; can_receive_visits?: unknown };
      if (typeof record.species_id !== 'number') continue;
      const id = String(record.species_id);
      const open = record.can_receive_visits === true || record.can_receive_visits === 1;
      if (open && publishedIds.has(id)) visible.add(id);
    }
  }
  return visible;
}

function mapVisitorCatalog(body: unknown, enclosuresBody: unknown, apiBaseUrl: string): VisitorCatalog {
  const visible = visitorSpeciesIds(body, enclosuresBody);
  const images: VisitorCatalog['images'] = {};
  for (const row of rowsOf(body)) {
    if (!row || typeof row !== 'object') continue;
    const record = row as { id?: unknown; image_url?: unknown };
    const id = String(record.id ?? '');
    if (visible.has(id) && typeof record.image_url === 'string') {
      const image = resolveUsableImageUrl(record.image_url, null, apiBaseUrl);
      if (image) images[id] = image;
    }
  }
  return { ids: [...visible], images };
}

export class ApiAnimalRepository implements AnimalRepository {
  private readonly httpClient: HttpClient;
  private readonly storage: KeyValueStorage;
  private readonly defaultTtl: number;
  private readonly apiBaseUrl: string;

  constructor(
    customClient?: HttpClient,
    customStorage: KeyValueStorage = defaultStorage,
    customTtl: number = FIVE_MINUTES_MS
  ) {
    this.defaultTtl = customTtl;
    this.storage = customStorage;
    this.apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8000/api/v1';
    this.httpClient = customClient ?? createHttpClient({ baseUrl: this.apiBaseUrl });
  }

  /**
   * Obtiene la lista completa de especies/animales con estrategia SWR.
   * Cumple con CA-01 y CA-05.
   */
  async getAllAnimals(): Promise<Animal[]> {
    const cached = await this.readCache<Animal[]>(CACHE_KEY_ALL);

    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) {
      return cached.data;
    }
    const previous = cached ?? await this.readCache<Animal[]>(LEGACY_CACHE_KEY_ALL);
    if (previous) {
      // Revalidar la caché anterior en segundo plano incluso si todavía está fresca.
      this.fetchAndCacheAllAnimals().catch(() => {});
      return previous.data;
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
        const visible = await this.readCache<VisitorCatalog>(CACHE_KEY_VISIBLE);
        if (visible && Date.now() - visible.cachedAt < visible.ttlMs) {
          if (!visible.data.ids.includes(id)) return null;
          if (cached.data && !cached.data.imageUrl) {
            return { ...cached.data, imageUrl: visible.data.images[id] };
          }
        } else {
          const legacy = await this.readLegacyVisibleIds();
          if (legacy && !legacy.includes(id)) return null;
        }
        return cached.data;
      }
      this.fetchAndCacheAnimalById(id, cacheKey).catch(() => {});
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

  async fetchAndCacheAllAnimals(): Promise<Animal[]> {
    const pending = listFlights.get(CACHE_KEY_ALL);
    if (pending) return pending;
    const flight = this.loadAllAnimals().finally(() => {
      if (listFlights.get(CACHE_KEY_ALL) === flight) listFlights.delete(CACHE_KEY_ALL);
    });
    listFlights.set(CACHE_KEY_ALL, flight);
    return flight;
  }

  private async loadAllAnimals(): Promise<Animal[]> {
    try {
      return await this.readVisitorCatalog();
    } catch (error) {
      const cached = await this.readCache<Animal[]>(CACHE_KEY_ALL)
        ?? await this.readCache<Animal[]>(LEGACY_CACHE_KEY_ALL);
      if (cached) return cached.data;
      throw error;
    }
  }

  private async readVisitorCatalog(): Promise<Animal[]> {
    const [speciesBody, publishedBody, enclosuresBody] = await Promise.all([
      this.httpClient.get<{ data: ApiSpeciesResponse[] } | ApiSpeciesResponse[]>('/species'),
      this.httpClient.get('/published-species'),
      this.httpClient.get('/enclosures'),
    ]);
    const catalog = mapVisitorCatalog(publishedBody, enclosuresBody, this.apiBaseUrl);
    const visible = new Set(catalog.ids);
    const rawData = (speciesBody as { data?: unknown })?.data ?? speciesBody;
    const list = Array.isArray(rawData)
      ? rawData
        .filter((row: ApiSpeciesResponse) => visible.has(String(row.id)))
        .map((row: ApiSpeciesResponse) => mapSpeciesToAnimalModel(row, this.apiBaseUrl, catalog.images[String(row.id)]))
      : [];
    await this.writeCache(CACHE_KEY_ALL, list);
    await this.writeCache(CACHE_KEY_VISIBLE, catalog);
    return list;
  }

  private async fetchAndCacheAnimalById(id: string, cacheKey: string): Promise<Animal | null> {
    try {
      const response = await this.httpClient.get<{ data: ApiSpeciesResponse }>(`/species/${id}`);
      if (!response?.data) return null;
      const speciesId = String(response.data.id);
      const catalog = await this.currentVisitorCatalog();
      if (!catalog.ids.includes(speciesId)) return null;
      const animal = mapSpeciesToAnimalModel(response.data, this.apiBaseUrl, catalog.images[speciesId]);
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

  private async currentVisitorCatalog(): Promise<VisitorCatalog> {
    const cached = await this.readCache<VisitorCatalog>(CACHE_KEY_VISIBLE);
    if (cached && Date.now() - cached.cachedAt < cached.ttlMs) return cached.data;

    try {
      const [publishedBody, enclosuresBody] = await Promise.all([
        this.httpClient.get('/published-species'),
        this.httpClient.get('/enclosures'),
      ]);
      const catalog = mapVisitorCatalog(publishedBody, enclosuresBody, this.apiBaseUrl);
      await this.writeCache(CACHE_KEY_VISIBLE, catalog);
      return catalog;
    } catch (error) {
      const legacy = await this.readLegacyVisibleIds();
      if (legacy) return { ids: legacy, images: {} };
      throw error;
    }
  }

  private async readLegacyVisibleIds(): Promise<string[] | null> {
    const cached = await this.readCache<string[]>(LEGACY_CACHE_KEY_VISIBLE);
    return cached && Date.now() - cached.cachedAt < cached.ttlMs ? cached.data : null;
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
