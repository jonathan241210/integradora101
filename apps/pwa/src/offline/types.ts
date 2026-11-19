export type SyncStatus = 'pending' | 'blocked' | 'syncing' | 'synced' | 'error' | 'conflict';

export type OutboxEntityType = 'animal' | 'evaluation';

export interface SyncMeta {
  userScope: string;
  lastSyncAt?: string;
  cursor?: string;
  bootstrappedAt?: string;
}

export interface CatalogAnimal {
  serverId: number;
  tagNumber: string;
  name: string;
  sex: string;
  birthDate: string | null;
  stayStatus: string;
  species: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface CatalogEnclosure {
  serverId: number;
  name: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface CatalogSpecies {
  serverId: number;
  commonName: string;
  updatedAt?: string | null;
  deletedAt?: string | null;
}

export interface LocalAnimal {
  localId: string;
  serverId?: number;
  name: string;
  tagNumber: string;
  speciesId?: number;
  speciesName?: string;
  enclosureId: number;
  sex: string;
  birthDate?: string;
  origin?: string;
  notes?: string;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface LocalEvaluation {
  localId: string;
  serverId?: number;
  kind: 'intense' | 'quick' | 'review';
  animalLocalId?: string;
  animalServerId?: number;
  payload: Record<string, string>;
  status: SyncStatus;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
  dependsOnLocalId?: string;
}

export interface OutboxItem {
  id: string;
  userScope: string;
  entityType: OutboxEntityType;
  entityLocalId: string;
  dependsOnLocalId?: string;
  status: SyncStatus;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
}

export interface IdMap {
  userScope: string;
  entityType: OutboxEntityType;
  localId: string;
  serverId: number;
  syncedAt: string;
}

export interface ToastMessage {
  id: string;
  text: string;
  tone?: 'info' | 'success' | 'warning' | 'error';
  createdAt: number;
}