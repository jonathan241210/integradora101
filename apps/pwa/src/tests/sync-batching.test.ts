import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const outboxItems = new Map<string, Record<string, unknown>>();
  return {
    outboxItems,
    syncOperations: vi.fn(),
    markOperationFailure: vi.fn(async () => undefined),
    updateOutboxStatus: vi.fn(async () => undefined),
  };
});

vi.mock('@/services/apiClient', () => ({ syncOperations: mocks.syncOperations }));
vi.mock('@/offline/db', () => ({
  offlineDb: {
    outbox: { get: async (id: string) => mocks.outboxItems.get(id) },
    localAnimals: {
      get: async ([, localId]: [string, string]) => ({ localId, name: 'Ejemplar', tagNumber: 'T', enclosureId: 1, sex: 'F' }),
    },
    localEvaluations: {
      get: async () => undefined,
      update: async () => undefined,
      where: () => ({ equals: () => ({ and: () => ({ toArray: async () => [] }) }) }),
    },
    idMap: { put: async () => undefined },
    transaction: async (_mode: string, _tables: unknown, fn: () => Promise<void>) => fn(),
  },
}));
vi.mock('@/offline/outbox', () => ({
  enqueueOperation: vi.fn(),
  getPendingForSync: vi.fn(async () => [...mocks.outboxItems.values()]),
  listOutbox: vi.fn(async () => []),
  markOperationFailure: mocks.markOperationFailure,
  saveLocalAnimal: vi.fn(),
  saveLocalEvaluation: vi.fn(),
  setLocalAnimalStatus: vi.fn(async () => undefined),
  setLocalEvaluationStatus: vi.fn(async () => undefined),
  unblockDependents: vi.fn(async () => undefined),
  updateOutboxStatus: mocks.updateOutboxStatus,
}));
vi.mock('@/offline/notifications', () => ({ pushToast: vi.fn() }));
vi.mock('@/offline/bootstrap', () => ({
  applyDeltaSync: vi.fn(async () => undefined),
  bootstrapCatalogs: vi.fn(async () => undefined),
  hasBootstrap: vi.fn(async () => true),
}));

import { SYNC_BATCH_SIZE, syncNow } from '@/offline/sync-manager';

function seedOutbox(count: number) {
  mocks.outboxItems.clear();
  for (let i = 0; i < count; i += 1) {
    const id = `op-${i}`;
    mocks.outboxItems.set(id, { id, entityType: 'animal', entityLocalId: `local-${i}`, status: 'pending', attempts: 0 });
  }
}

describe('pwa-012 · envío de la cola por lotes', () => {
  beforeEach(() => {
    mocks.syncOperations.mockReset();
    mocks.markOperationFailure.mockClear();
  });

  it('CA-09: divide más de 100 operaciones en lotes de máximo 100, en orden', async () => {
    seedOutbox(250);
    mocks.syncOperations.mockImplementation(async (inputs: Array<{ operation_uuid: string }>) =>
      inputs.map((input) => ({ operation_uuid: input.operation_uuid, status: 'duplicate', server_id: 1 })),
    );

    await syncNow('user:1', { force: true });

    const sizes = mocks.syncOperations.mock.calls.map(([batch]) => (batch as unknown[]).length);
    expect(SYNC_BATCH_SIZE).toBe(100);
    expect(sizes).toEqual([100, 100, 50]);
    const firstIds = mocks.syncOperations.mock.calls.map(([batch]) => (batch as Array<{ operation_uuid: string }>)[0].operation_uuid);
    expect(firstIds).toEqual(['op-0', 'op-100', 'op-200']);
    expect(mocks.markOperationFailure).not.toHaveBeenCalled();
  });

  it('CA-09: si falla un lote, solo ese lote y los siguientes quedan con fallo', async () => {
    seedOutbox(150);
    mocks.syncOperations
      .mockImplementationOnce(async (inputs: Array<{ operation_uuid: string }>) =>
        inputs.map((input) => ({ operation_uuid: input.operation_uuid, status: 'completed', server_id: 1 })),
      )
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await syncNow('user:1', { force: true });

    expect(mocks.syncOperations).toHaveBeenCalledTimes(2);
    expect(mocks.markOperationFailure).toHaveBeenCalledTimes(50);
  });
});
