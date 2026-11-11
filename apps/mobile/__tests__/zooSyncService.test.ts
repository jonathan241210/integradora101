import { syncZooData, LAST_SYNC_KEY } from '../src/services/zooSyncService';
import { defaultStorage } from '../src/repositories/storage';

describe('Mobile — Sincronización y persistencia offline de recintos y animales al iniciar sesión', () => {
  beforeEach(async () => {
    await defaultStorage.removeItem(LAST_SYNC_KEY);
  });

  it('ejecuta la sincronización prioritaria guardando el timestamp de última sincronización', async () => {
    const result = await syncZooData();

    expect(result.ok).toBe(true);
    expect(result.placesCount).toBeGreaterThan(0);
    expect(result.syncedAt).toBeGreaterThan(0);

    const storedTimestamp = await defaultStorage.getItem(LAST_SYNC_KEY);
    expect(storedTimestamp).toBe(String(result.syncedAt));
  });

  it('reutiliza la promesa en curso si se ejecutan múltiples sincronizaciones simultáneas (in-flight flight deduplication)', async () => {
    const [result1, result2] = await Promise.all([
      syncZooData(),
      syncZooData(),
    ]);

    expect(result1.ok).toBe(true);
    expect(result2.ok).toBe(true);
    expect(result1.syncedAt).toBe(result2.syncedAt);
  });
});
