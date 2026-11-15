import { defaultStorage, type KeyValueStorage } from './storage';

const STORAGE_KEY = 'visitor.favorite-animal-ids';

export function createFavoriteAnimals(storage: KeyValueStorage) {
  let ids: string[] | null = null;
  const listeners = new Set<(next: string[]) => void>();

  function publish(next: string[]) {
    ids = next;
    listeners.forEach((listener) => listener(next));
  }

  async function list(): Promise<string[]> {
    if (ids) return ids;
    const raw = await storage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) as unknown : [];
    const next = Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    ids = next;
    return next;
  }

  async function toggle(id: string): Promise<string[]> {
    const current = await list();
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));
    publish(next);
    return next;
  }

  function subscribe(listener: (next: string[]) => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function resetForTests(): void {
    ids = null;
    listeners.clear();
  }

  return { list, toggle, subscribe, resetForTests };
}

export const favoriteAnimals = createFavoriteAnimals(defaultStorage);
