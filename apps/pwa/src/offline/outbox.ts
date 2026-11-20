import { offlineDb } from './db';
import type { LocalAnimal, LocalEvaluation, OutboxEntityType, OutboxItem, SyncStatus } from './types';
import { backoffMs, nowIso } from './utils';

export async function enqueueOperation(params: {
  userScope: string;
  entityType: OutboxEntityType;
  entityLocalId: string;
  dependsOnLocalId?: string;
  status?: SyncStatus;
}): Promise<OutboxItem> {
  const createdAt = nowIso();
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    userScope: params.userScope,
    entityType: params.entityType,
    entityLocalId: params.entityLocalId,
    dependsOnLocalId: params.dependsOnLocalId,
    status: params.status ?? (params.dependsOnLocalId ? 'blocked' : 'pending'),
    attempts: 0,
    createdAt,
    updatedAt: createdAt,
  };
  await offlineDb.outbox.put(item);
  return item;
}

export async function updateOutboxStatus(
  id: string,
  patch: Partial<Pick<OutboxItem, 'status' | 'attempts' | 'lastError' | 'lastAttemptAt' | 'nextAttemptAt' | 'updatedAt'>>,
): Promise<void> {
  await offlineDb.outbox.update(id, { ...patch, updatedAt: patch.updatedAt ?? nowIso() });
}

export async function markOperationFailure(id: string, attempts: number, error: string, temporary: boolean): Promise<void> {
  const nextAttempts = attempts + 1;
  await updateOutboxStatus(id, {
    status: temporary ? 'pending' : 'error',
    attempts: nextAttempts,
    lastError: error,
    lastAttemptAt: nowIso(),
    nextAttemptAt: temporary ? new Date(Date.now() + backoffMs(nextAttempts)).toISOString() : undefined,
  });
}

export async function listOutbox(userScope: string): Promise<OutboxItem[]> {
  return offlineDb.outbox.where('userScope').equals(userScope).sortBy('createdAt');
}

export async function getPendingForSync(userScope: string, options: { includeBackoff?: boolean } = {}): Promise<OutboxItem[]> {
  const items = await offlineDb.outbox.where('userScope').equals(userScope).toArray();
  const now = Date.now();
  const includeBackoff = options.includeBackoff === true;
  return items
    .filter((item) => {
      const statusOk = includeBackoff
        ? (item.status === 'pending' || item.status === 'blocked' || item.status === 'error')
        : (item.status === 'pending' || item.status === 'blocked');
      if (!statusOk) return false;
      if (includeBackoff) return true;
      return !item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now;
    })
    .sort((a, b) => {
      if (a.entityType === b.entityType) return a.createdAt.localeCompare(b.createdAt);
      return a.entityType === 'animal' ? -1 : 1; // animales primero
    });
}

export async function setLocalAnimalStatus(userScope: string, localId: string, status: SyncStatus, serverId?: number, lastError?: string): Promise<void> {
  await offlineDb.localAnimals.update([userScope, localId], { status, serverId, lastError, updatedAt: nowIso() });
}

export async function setLocalEvaluationStatus(userScope: string, localId: string, status: SyncStatus, serverId?: number, lastError?: string): Promise<void> {
  await offlineDb.localEvaluations.update([userScope, localId], { status, serverId, lastError, updatedAt: nowIso() });
}

export async function unblockDependents(userScope: string, parentLocalId: string): Promise<void> {
  const dependents = await offlineDb.outbox
    .where('userScope').equals(userScope)
    .and((item) => item.dependsOnLocalId === parentLocalId && item.status === 'blocked')
    .toArray();
  await Promise.all(dependents.map((item) => updateOutboxStatus(item.id, { status: 'pending', nextAttemptAt: undefined })));
}

export async function saveLocalAnimal(userScope: string, animal: LocalAnimal): Promise<void> {
  await offlineDb.localAnimals.put({ ...animal, userScope } as LocalAnimal & { userScope: string });
}

export async function saveLocalEvaluation(userScope: string, evaluation: LocalEvaluation): Promise<void> {
  await offlineDb.localEvaluations.put({ ...evaluation, userScope } as LocalEvaluation & { userScope: string });
}