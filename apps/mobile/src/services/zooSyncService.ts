import { createMapRepository, createAnimalRepository, ApiMapRepository, ApiAnimalRepository } from '../repositories';
import { defaultStorage } from '../repositories/storage';

export const LAST_SYNC_KEY = '@arca:last_sync_timestamp';

export interface ZooSyncResult {
  ok: boolean;
  placesCount: number;
  animalsCount: number;
  syncedAt: number;
  error?: string;
}

let syncInFlight: Promise<ZooSyncResult> | null = null;

/**
 * Sincroniza y almacena en caché offline los recintos, animales y especies del zoológico.
 * Se ejecuta prioritariamente al iniciar sesión o al arrancar la app cuando hay internet,
 * garantizando que el recorrido AR y el mapa funcionen de forma offline sin interrupciones.
 */
export async function syncZooData(): Promise<ZooSyncResult> {
  if (syncInFlight) {
    return syncInFlight;
  }

  const execution = (async () => {
    try {
      const mapRepo = createMapRepository();
      const animalRepo = createAnimalRepository();

      // 1. Prioridad: Guardar los recintos y sus animales reales de la BD
      let placesCount = 0;
      if (mapRepo instanceof ApiMapRepository) {
        const places = await mapRepo.fetchAndCachePlaces();
        placesCount = places.length;
      } else {
        const places = await mapRepo.getPlaces();
        placesCount = places.length;
      }

      // 2. Guardar en caché el catálogo completo de especies
      let animalsCount = 0;
      if (animalRepo instanceof ApiAnimalRepository) {
        const animals = await animalRepo.fetchAndCacheAllAnimals();
        animalsCount = animals.length;
      } else {
        const animals = await animalRepo.getAllAnimals();
        animalsCount = animals.length;
      }

      const now = Date.now();
      await defaultStorage.setItem(LAST_SYNC_KEY, String(now));

      return {
        ok: true,
        placesCount,
        animalsCount,
        syncedAt: now,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error desconocido al precargar datos';
      // Degradación silenciosa: la app seguirá usando lo que ya tenga en caché local
      return {
        ok: false,
        placesCount: 0,
        animalsCount: 0,
        syncedAt: 0,
        error: message,
      };
    } finally {
      syncInFlight = null;
    }
  })();

  syncInFlight = execution;
  return execution;
}
