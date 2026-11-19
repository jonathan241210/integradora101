import { syncOperations, type EvaluationKind, type SyncOperationInput, type SyncOperationResult } from '@/services/apiClient';
import { offlineDb } from './db';
import {
  enqueueOperation,
  getPendingForSync,
  listOutbox,
  markOperationFailure,
  saveLocalAnimal,
  saveLocalEvaluation,
  setLocalAnimalStatus,
  setLocalEvaluationStatus,
  unblockDependents,
  updateOutboxStatus,
} from './outbox';
import { pushToast } from './notifications';
import { applyDeltaSync, bootstrapCatalogs, hasBootstrap } from './bootstrap';
import type { LocalAnimal, LocalEvaluation, OutboxItem } from './types';
import { isOnline, nowIso, toErrorMessage, toUserSyncMessage } from './utils';

let syncing = false;

function isTemporaryError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status?: number }).status;
    if (status === 0 || status === undefined) return true;
    if (typeof status === 'number') {
      // Errores de transporte/servidor/sesión/ruta: reintentar más tarde (pueden resolverse).
      // 422 suele indicar payload inválido del lote completo; se maneja aparte, pero por defecto
      // preferimos no bloquear la cola permanentemente ante fallos de envío.
      if (status >= 500) return true;
      if ([401, 403, 404, 408, 409, 425, 429].includes(status)) return true;
      return false;
    }
  }
  return true;
}

export async function ensureBootstrap(userScope: string): Promise<void> {
  if (!isOnline()) return;
  const ready = await hasBootstrap(userScope);
  if (!ready) {
    await bootstrapCatalogs(userScope);
  } else {
    try {
      await applyDeltaSync(userScope);
    } catch {
      // Si delta falla, se conserva el catálogo local y se reintentará en próximo ciclo.
    }
  }
}

export async function queueAnimal(userScope: string, input: Omit<LocalAnimal, 'localId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<LocalAnimal> {
  const createdAt = nowIso();
  const local: LocalAnimal = {
    ...input,
    localId: crypto.randomUUID(),
    status: 'pending',
    createdAt,
    updatedAt: createdAt,
  };
  await offlineDb.transaction('rw', [offlineDb.localAnimals, offlineDb.outbox], async () => {
    await saveLocalAnimal(userScope, local);
    await enqueueOperation({ userScope, entityType: 'animal', entityLocalId: local.localId });
  });
  pushToast('Registro de animal guardado localmente (pendiente de sincronización).', 'info');
  return local;
}

export async function queueEvaluation(
  userScope: string,
  input: { kind: EvaluationKind; animalLocalId?: string; animalServerId?: number; payload: Record<string, string> },
): Promise<LocalEvaluation> {
  const createdAt = nowIso();
  const dependsOnLocalId = input.animalLocalId && !input.animalServerId ? input.animalLocalId : undefined;
  const local: LocalEvaluation = {
    localId: crypto.randomUUID(),
    kind: input.kind,
    animalLocalId: input.animalLocalId,
    animalServerId: input.animalServerId,
    payload: input.payload,
    dependsOnLocalId,
    status: dependsOnLocalId ? 'blocked' : 'pending',
    createdAt,
    updatedAt: createdAt,
  };
  await offlineDb.transaction('rw', [offlineDb.localEvaluations, offlineDb.outbox], async () => {
    await saveLocalEvaluation(userScope, local);
    await enqueueOperation({ userScope, entityType: 'evaluation', entityLocalId: local.localId, dependsOnLocalId, status: local.status });
  });
  pushToast('Diagnóstico guardado localmente (pendiente de sincronización).', 'info');
  return local;
}

async function canProcess(item: OutboxItem, userScope: string): Promise<boolean> {
  if (!item.dependsOnLocalId) return true;
  const dep = await offlineDb.localAnimals.get([userScope, item.dependsOnLocalId]);
  return Boolean(dep?.serverId);
}

function isTemporaryResult(result: SyncOperationResult): boolean {
  return result.status === 'error' || result.status === 'temporary_error';
}

async function buildOperationInput(item: OutboxItem, userScope: string): Promise<SyncOperationInput | null> {
  if (item.entityType === 'animal') {
    const local = await offlineDb.localAnimals.get([userScope, item.entityLocalId]);
    if (!local) return null;
    return {
      operation_uuid: item.id,
      entity_type: 'animal',
      client_entity_id: local.localId,
      payload: {
        name: local.name,
        tag_number: local.tagNumber,
        enclosure_id: local.enclosureId,
        sex: local.sex === 'F' || local.sex === 'hembra' ? 'hembra' : 'macho',
        birth_date: local.birthDate,
        origin: local.origin,
        notes: local.notes,
        ...(local.speciesId ? { species_id: local.speciesId } : local.speciesName ? { species: local.speciesName } : {}),
      },
    };
  }

  const local = await offlineDb.localEvaluations.get([userScope, item.entityLocalId]);
  if (!local) return null;
  let animalServerId = local.animalServerId;
  if (!animalServerId && local.animalLocalId) {
    const animal = await offlineDb.localAnimals.get([userScope, local.animalLocalId]);
    animalServerId = animal?.serverId;
  }
  return {
    operation_uuid: item.id,
    entity_type: 'clinical_evaluation',
    client_entity_id: local.localId,
    depends_on_client_entity_id: !animalServerId ? local.animalLocalId : undefined,
    payload: {
      kind: local.kind,
      animal_id: animalServerId,
      animal_local_id: local.animalLocalId,
      data: { ...local.payload, is_follow_up: local.payload.is_follow_up ?? '1' },
    },
  };
}

async function applySuccess(item: OutboxItem, userScope: string, serverId?: number | null): Promise<void> {
  if (item.entityType === 'animal') {
    const local = await offlineDb.localAnimals.get([userScope, item.entityLocalId]);
    await offlineDb.transaction('rw', [offlineDb.localAnimals, offlineDb.outbox, offlineDb.idMap, offlineDb.localEvaluations], async () => {
      if (serverId) await offlineDb.idMap.put({ userScope, entityType: 'animal', localId: item.entityLocalId, serverId, syncedAt: nowIso() });
      await setLocalAnimalStatus(userScope, item.entityLocalId, 'synced', serverId ?? undefined);
      await updateOutboxStatus(item.id, { status: 'synced', lastError: undefined, nextAttemptAt: undefined });
      const evals = await offlineDb.localEvaluations.where('userScope').equals(userScope).and((e) => e.animalLocalId === item.entityLocalId).toArray();
      await Promise.all(evals.map((e) => offlineDb.localEvaluations.update([userScope, e.localId], { animalServerId: serverId ?? e.animalServerId, status: e.status === 'blocked' ? 'pending' : e.status, updatedAt: nowIso() })));
    });
    await unblockDependents(userScope, item.entityLocalId);
    if (local) pushToast(`Se ha subido el registro del animal ${local.name}.`, 'success');
    return;
  }

  const local = await offlineDb.localEvaluations.get([userScope, item.entityLocalId]);
  await offlineDb.transaction('rw', [offlineDb.localEvaluations, offlineDb.outbox, offlineDb.idMap], async () => {
    if (serverId) await offlineDb.idMap.put({ userScope, entityType: 'evaluation', localId: item.entityLocalId, serverId, syncedAt: nowIso() });
    await setLocalEvaluationStatus(userScope, item.entityLocalId, 'synced', serverId ?? undefined);
    await updateOutboxStatus(item.id, { status: 'synced', lastError: undefined, nextAttemptAt: undefined });
  });
  if (local) pushToast(`Se ha subido el diagnóstico (${local.kind === 'intense' ? 'intenso' : local.kind === 'quick' ? 'rápido' : 'revisión'}).`, 'success');
}

async function applyFailure(item: OutboxItem, userScope: string, message: string, temporary: boolean): Promise<void> {
  await markOperationFailure(item.id, item.attempts, message, temporary);
  if (item.entityType === 'animal') {
    await setLocalAnimalStatus(userScope, item.entityLocalId, temporary ? 'pending' : 'error', undefined, message);
  } else {
    await setLocalEvaluationStatus(userScope, item.entityLocalId, temporary ? 'pending' : 'error', undefined, message);
  }
  if (!temporary) pushToast(message, 'error');
}

export async function syncNow(userScope: string, options: { force?: boolean } = {}): Promise<void> {
  if (syncing) return;
  if (!options.force && !isOnline()) return;
  syncing = true;
  try {
    try {
      await ensureBootstrap(userScope);
    } catch (error) {
      // Si falla bootstrap/delta por conectividad o sesión, se continúa con la cola local
      // (las operaciones pendientes se reintentarán cuando sea posible).
      if (options.force) {
        pushToast(toErrorMessage(error), 'warning');
      }
    }

    const queue = await getPendingForSync(userScope, { includeBackoff: options.force === true });
    const prepared: Array<{ item: OutboxItem; input: SyncOperationInput }> = [];
    for (const item of queue) {
      const fresh = await offlineDb.outbox.get(item.id);
      if (!fresh || fresh.status === 'synced' || fresh.status === 'syncing') continue;
      if (!(await canProcess(fresh, userScope))) {
        await updateOutboxStatus(fresh.id, { status: 'blocked', nextAttemptAt: undefined });
        continue;
      }
      const input = await buildOperationInput(fresh, userScope);
      if (!input) {
        await applyFailure(fresh, userScope, 'Registro local no encontrado.', false);
        continue;
      }
      await updateOutboxStatus(fresh.id, { status: 'syncing', lastAttemptAt: nowIso(), nextAttemptAt: undefined });
      if (fresh.entityType === 'animal') await setLocalAnimalStatus(userScope, fresh.entityLocalId, 'syncing');
      else await setLocalEvaluationStatus(userScope, fresh.entityLocalId, 'syncing');
      prepared.push({ item: fresh, input });
    }

    if (prepared.length === 0) return;

    let results: SyncOperationResult[] = [];
    try {
      results = await syncOperations(prepared.map((p) => p.input));
    } catch (error) {
      const temporary = isTemporaryError(error);
      const message = toErrorMessage(error);
      for (const { item } of prepared) {
        await applyFailure(item, userScope, message, temporary);
      }
      return;
    }

    const byId = new Map(results.map((r) => [r.operation_uuid, r]));
    for (const { item } of prepared) {
      const result = byId.get(item.id);
      if (!result) {
        await applyFailure(item, userScope, 'No se recibió confirmación del servidor. Se reintentará automáticamente.', true);
        continue;
      }
      if (result.status === 'completed' || result.status === 'duplicate') {
        await applySuccess(item, userScope, result.server_id ?? undefined);
      } else if (result.status === 'rejected') {
        const code = result.error_code ?? '';
        const temporary = code === 'processing_error' || isTemporaryResult(result);
        const message = toUserSyncMessage(result.message, 'La operación fue rechazada por el servidor.');
        await applyFailure(item, userScope, message, temporary && code === 'processing_error');
      } else {
        const message = toUserSyncMessage(result.message, 'No se pudo sincronizar la operación.');
        await applyFailure(item, userScope, message, true);
      }
    }

    // Intento de delta tras procesar lote
    try { await applyDeltaSync(userScope); } catch { /* noop */ }
  } finally {
    syncing = false;
  }
}

export async function getSyncSnapshot(userScope: string) {
  const [outbox, animals, evaluations] = await Promise.all([
    listOutbox(userScope),
    offlineDb.localAnimals.where('userScope').equals(userScope).toArray(),
    offlineDb.localEvaluations.where('userScope').equals(userScope).toArray(),
  ]);
  return { outbox, animals, evaluations };
}

export async function notifyPendingSummary(userScope: string): Promise<void> {
  const pending = await offlineDb.outbox.where('userScope').equals(userScope).and((i) => i.status !== 'synced').toArray();
  if (pending.length === 0) return;
  const animals = pending.filter((i) => i.entityType === 'animal').length;
  const evals = pending.filter((i) => i.entityType === 'evaluation').length;
  pushToast(`Hay ${pending.length} registro(s) pendiente(s) de sincronización (animales: ${animals}, diagnósticos: ${evals}). Se subirán primero los animales.`, 'info', 6000);
}

export function startSyncListeners(userScopeProvider: () => string | null): () => void {
  const run = () => {
    const scope = userScopeProvider();
    if (scope) void syncNow(scope);
  };
  window.addEventListener('online', run);
  window.addEventListener('focus', run);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run(); });
  run();
  return () => {
    window.removeEventListener('online', run);
    window.removeEventListener('focus', run);
  };
}