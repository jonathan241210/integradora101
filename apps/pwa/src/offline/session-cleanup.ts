import { offlineDb } from './db';

/** Cantidad de operaciones del usuario que aún no se confirmaron en el servidor (pwa-012 CA-04). */
export async function countPendingOperations(userScope: string): Promise<number> {
  const items = await offlineDb.outbox.where('userScope').equals(userScope).toArray();
  return items.filter((item) => item.status !== 'synced').length;
}

/**
 * Borra de IndexedDB los datos del usuario (evaluaciones, ejemplares locales, catálogos,
 * operaciones y metadatos). No toca los registros de otros usuarios (pwa-012 CA-03, RN-01).
 */
export async function clearUserOfflineData(userScope: string): Promise<void> {
  const tables = [
    offlineDb.localEvaluations,
    offlineDb.localAnimals,
    offlineDb.outbox,
    offlineDb.idMap,
    offlineDb.animalsCatalog,
    offlineDb.enclosuresCatalog,
    offlineDb.speciesCatalog,
    offlineDb.meta,
  ] as Array<{ where: (index: string) => { equals: (value: string) => { delete: () => Promise<void> } } }>;
  for (const table of tables) {
    await table.where('userScope').equals(userScope).delete();
  }
}
