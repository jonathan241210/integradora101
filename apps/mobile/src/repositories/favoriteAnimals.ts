import { createVisitorApi, type VisitorApi } from '@arca/api-client';
import { createSecureTokenStorage, type TokenStorage } from '../services/tokenStorage';
import { defaultStorage, type KeyValueStorage } from './storage';

const LEGACY_KEY = 'visitor.favorite-animal-ids';
const COPY_KEY = 'visitor.favorite-species-ids';

export type FavoriteStore = {
  readCopy: () => Promise<string[]>;
  readLegacy: () => Promise<string[]>;
  writeCopy: (ids: string[]) => Promise<void>;
  writeLegacy: (ids: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
  subscribe: (listener: (ids: string[]) => void) => () => void;
  retain: () => void;
  release: () => void;
  readerCount: () => number;
  isFresh: () => boolean;
  markFresh: () => void;
  forgetFresh: () => void;
  resetForTests: () => void;
};

function parseIds(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export function createFavoriteAnimals(storage: KeyValueStorage): FavoriteStore {
  let ids: string[] = [];
  let readers = 0;
  let fresh = false;
  const listeners = new Set<(next: string[]) => void>();

  function publish(next: string[]): void {
    ids = next;
    listeners.forEach((listener) => listener(next));
  }

  async function readKey(key: string): Promise<string[]> {
    return parseIds(await storage.getItem(key));
  }

  async function writeKey(key: string, next: string[]): Promise<void> {
    if (next.length === 0) {
      await storage.removeItem(key);
      return;
    }
    await storage.setItem(key, JSON.stringify(next));
  }

  return {
    async readCopy() {
      const next = await readKey(COPY_KEY);
      publish(next);
      return next;
    },
    readLegacy: () => readKey(LEGACY_KEY),
    async writeCopy(next) {
      await writeKey(COPY_KEY, next);
      publish(next);
    },
    writeLegacy: (next) => writeKey(LEGACY_KEY, next),
    async clearAll() {
      fresh = false;
      await storage.removeItem(LEGACY_KEY);
      await storage.removeItem(COPY_KEY);
      publish([]);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    retain() {
      readers += 1;
    },
    release() {
      readers = Math.max(0, readers - 1);
    },
    readerCount: () => readers,
    isFresh: () => fresh,
    markFresh() {
      fresh = true;
    },
    forgetFresh() {
      fresh = false;
    },
    resetForTests() {
      ids = [];
      readers = 0;
      fresh = false;
      listeners.clear();
    },
  };
}

export const favoriteAnimals = createFavoriteAnimals(defaultStorage);

export async function clearFavoriteCopies(): Promise<void> {
  await favoriteAnimals.clearAll();
}

export function createFavoriteSpeciesClient(options?: {
  workerId?: string;
  apiUrl?: string;
  fetchImpl?: typeof fetch;
  storage?: TokenStorage;
}): VisitorApi | null {
  const workerId = options === undefined ? process.env.JEST_WORKER_ID : options.workerId;
  const apiUrl = options === undefined ? process.env.EXPO_PUBLIC_API_URL : options.apiUrl;
  if (workerId !== undefined) return null;
  const baseUrl = apiUrl?.trim() ?? '';
  if (!baseUrl) return null;
  const tokens = options?.storage ?? createSecureTokenStorage();
  return createVisitorApi({
    baseUrl,
    fetchImpl: options?.fetchImpl,
    getAccessToken: async () => (await tokens.read())?.accessToken ?? null,
    getRefreshToken: async () => (await tokens.read())?.refreshToken ?? null,
    onTokens: async (next) => {
      const current = await tokens.read();
      await tokens.write({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken ?? current?.refreshToken ?? '',
      });
    },
    onSessionExpired: async () => {
      await tokens.clear();
      await favoriteAnimals.clearAll();
    },
  });
}
