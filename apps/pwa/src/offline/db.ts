import type {
  CatalogAnimal,
  CatalogEnclosure,
  CatalogSpecies,
  IdMap,
  LocalAnimal,
  LocalEvaluation,
  OutboxItem,
  SyncMeta,
} from './types';

type Key = IDBValidKey;

function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transacción abortada'));
  });
}

class WhereQuery<T> {
  constructor(
    private readonly table: TableCompat<T>,
    private readonly indexName: string,
    private readonly value: Key,
  ) {}

  and(predicate: (item: T) => boolean) {
    return {
      toArray: async (): Promise<T[]> => (await this.toArray()).filter(predicate),
    };
  }

  async toArray(): Promise<T[]> {
    const db = await this.table.dbPromise;
    const tx = db.transaction(this.table.name, 'readonly');
    const store = tx.objectStore(this.table.name);
    const index = store.index(this.indexName);
    const result = await reqToPromise(index.getAll(this.value as any));
    await txDone(tx).catch(() => undefined);
    return result as T[];
  }

  async delete(): Promise<void> {
    const items = await this.toArray();
    if (items.length === 0) return;
    const db = await this.table.dbPromise;
    const tx = db.transaction(this.table.name, 'readwrite');
    const store = tx.objectStore(this.table.name);
    for (const item of items) {
      const key = this.table.extractKey(item);
      store.delete(key as any);
    }
    await txDone(tx);
  }

  async sortBy(field: keyof T & string): Promise<T[]> {
    const items = await this.toArray();
    return items.sort((a, b) => String(a[field] ?? '').localeCompare(String(b[field] ?? '')));
  }
}

class TableCompat<T> {
  constructor(
    readonly name: string,
    readonly dbPromise: Promise<IDBDatabase>,
    private readonly keyPath: string | string[],
  ) {}

  extractKey(item: T): Key {
    if (Array.isArray(this.keyPath)) {
      return this.keyPath.map((part) => (item as any)[part]) as unknown as Key;
    }
    return (item as any)[this.keyPath] as Key;
  }

  async put(value: T): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readwrite');
    tx.objectStore(this.name).put(value as any);
    await txDone(tx);
  }

  async bulkPut(values: T[]): Promise<void> {
    if (values.length === 0) return;
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readwrite');
    const store = tx.objectStore(this.name);
    for (const value of values) store.put(value as any);
    await txDone(tx);
  }

  async get(key: Key): Promise<T | undefined> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readonly');
    const result = await reqToPromise(tx.objectStore(this.name).get(key as any));
    await txDone(tx).catch(() => undefined);
    return (result as T | undefined) ?? undefined;
  }

  async update(key: Key, changes: Partial<T>): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readwrite');
    const store = tx.objectStore(this.name);
    const current = await reqToPromise(store.get(key as any));
    if (current !== undefined) {
      store.put({ ...(current as object), ...(changes as object) } as any);
    }
    await txDone(tx);
  }

  async delete(key: Key): Promise<void> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readwrite');
    tx.objectStore(this.name).delete(key as any);
    await txDone(tx);
  }

  async toArray(): Promise<T[]> {
    const db = await this.dbPromise;
    const tx = db.transaction(this.name, 'readonly');
    const result = await reqToPromise(tx.objectStore(this.name).getAll());
    await txDone(tx).catch(() => undefined);
    return result as T[];
  }

  where(indexName: string) {
    return {
      equals: (value: Key) => new WhereQuery<T>(this, indexName, value),
    };
  }
}

export class OfflineDatabase {
  meta!: TableCompat<SyncMeta & { id: string }>;
  animalsCatalog!: TableCompat<CatalogAnimal & { userScope: string }>;
  enclosuresCatalog!: TableCompat<CatalogEnclosure & { userScope: string }>;
  speciesCatalog!: TableCompat<CatalogSpecies & { userScope: string }>;
  localAnimals!: TableCompat<LocalAnimal & { userScope: string }>;
  localEvaluations!: TableCompat<LocalEvaluation & { userScope: string }>;
  outbox!: TableCompat<OutboxItem>;
  idMap!: TableCompat<IdMap>;

  private _dbPromise: Promise<IDBDatabase> | null = null;

  private get dbPromise(): Promise<IDBDatabase> {
    if (!this._dbPromise) this._dbPromise = this.open();
    return this._dbPromise;
  }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB no disponible en este entorno.'));
        return;
      }
      const request = indexedDB.open('arca-pwa-offline', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        const ensure = (name: string, keyPath: string | string[], indexes: Array<{ name: string; keyPath: string | string[]; unique?: boolean }>) => {
          const store = db.objectStoreNames.contains(name)
            ? request.transaction!.objectStore(name)
            : db.createObjectStore(name, { keyPath });
          for (const idx of indexes) {
            if (!store.indexNames.contains(idx.name)) store.createIndex(idx.name, idx.keyPath as any, { unique: idx.unique });
          }
        };
        ensure('meta', 'id', [{ name: 'userScope', keyPath: 'userScope' }]);
        ensure('animalsCatalog', ['userScope', 'serverId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'serverId', keyPath: 'serverId' },
          { name: 'deletedAt', keyPath: 'deletedAt' },
        ]);
        ensure('enclosuresCatalog', ['userScope', 'serverId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'serverId', keyPath: 'serverId' },
          { name: 'deletedAt', keyPath: 'deletedAt' },
        ]);
        ensure('speciesCatalog', ['userScope', 'serverId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'serverId', keyPath: 'serverId' },
          { name: 'deletedAt', keyPath: 'deletedAt' },
        ]);
        ensure('localAnimals', ['userScope', 'localId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'localId', keyPath: 'localId' },
          { name: 'serverId', keyPath: 'serverId' },
          { name: 'status', keyPath: 'status' },
          { name: 'createdAt', keyPath: 'createdAt' },
        ]);
        ensure('localEvaluations', ['userScope', 'localId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'localId', keyPath: 'localId' },
          { name: 'serverId', keyPath: 'serverId' },
          { name: 'animalLocalId', keyPath: 'animalLocalId' },
          { name: 'animalServerId', keyPath: 'animalServerId' },
          { name: 'status', keyPath: 'status' },
          { name: 'dependsOnLocalId', keyPath: 'dependsOnLocalId' },
          { name: 'createdAt', keyPath: 'createdAt' },
        ]);
        ensure('outbox', 'id', [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'entityType', keyPath: 'entityType' },
          { name: 'entityLocalId', keyPath: 'entityLocalId' },
          { name: 'dependsOnLocalId', keyPath: 'dependsOnLocalId' },
          { name: 'status', keyPath: 'status' },
          { name: 'createdAt', keyPath: 'createdAt' },
          { name: 'updatedAt', keyPath: 'updatedAt' },
          { name: 'nextAttemptAt', keyPath: 'nextAttemptAt' },
        ]);
        ensure('idMap', ['userScope', 'entityType', 'localId'], [
          { name: 'userScope', keyPath: 'userScope' },
          { name: 'entityType', keyPath: 'entityType' },
          { name: 'localId', keyPath: 'localId' },
          { name: 'serverId', keyPath: 'serverId' },
        ]);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  constructor() {
    const p = this.dbPromise;
    this.meta = new TableCompat('meta', p, 'id');
    this.animalsCatalog = new TableCompat('animalsCatalog', p, ['userScope', 'serverId']);
    this.enclosuresCatalog = new TableCompat('enclosuresCatalog', p, ['userScope', 'serverId']);
    this.speciesCatalog = new TableCompat('speciesCatalog', p, ['userScope', 'serverId']);
    this.localAnimals = new TableCompat('localAnimals', p, ['userScope', 'localId']);
    this.localEvaluations = new TableCompat('localEvaluations', p, ['userScope', 'localId']);
    this.outbox = new TableCompat('outbox', p, 'id');
    this.idMap = new TableCompat('idMap', p, ['userScope', 'entityType', 'localId']);
  }

  async transaction(_mode: 'rw' | 'r', _tables: unknown[], fn: () => Promise<void> | void): Promise<void> {
    // Compatibilidad simple: ejecuta la operación; las escrituras individuales son atómicas por store.
    await fn();
  }
}

let _offlineDb: OfflineDatabase | null = null;

export function getOfflineDb(): OfflineDatabase {
  if (!_offlineDb) _offlineDb = new OfflineDatabase();
  return _offlineDb;
}

export const offlineDb: OfflineDatabase = new Proxy({} as OfflineDatabase, {
  get(_target, prop) {
    return (getOfflineDb() as unknown as Record<PropertyKey, unknown>)[prop];
  },
}) as OfflineDatabase;