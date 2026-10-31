import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Abstracción de almacenamiento clave-valor asíncrono.
 * Permite inyectar una implementación en memoria en pruebas.
 */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryKeyValueStorage implements KeyValueStorage {
  private readonly store = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}

/**
 * Caché persistente del catálogo público (ADR 0014).
 * Solo guarda datos públicos; nunca tokens ni datos personales.
 */
export const defaultStorage: KeyValueStorage = AsyncStorage;
