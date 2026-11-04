import type { ApiError } from '@arca/api-client';
import { MemoryKeyValueStorage, defaultStorage, type KeyValueStorage } from '../repositories/storage';
import {
  isOfflineError,
  isRateLimitError,
  progressRepository,
  type DiscoveryOutcome,
  type ProgressRepository,
} from '../repositories/progressRepository';

const STORAGE_KEY = 'visitor.scan-queue';

export type QueuedScan = {
  code: string;
  scannedAt: string;
  clientScanId: string;
  pending: true;
};

export type ScanPresentation = {
  kind: DiscoveryOutcome['result'] | 'pending' | 'rate_limited';
  title: string;
  message: string;
  pointsAwarded?: number;
  newSpecies?: string[];
};

const TITLES: Record<ScanPresentation['kind'], string> = {
  discovered: 'Nuevo descubrimiento',
  already_discovered: 'Ya descubierto',
  invalid_code: 'Código inválido',
  inactive_code: 'Código inválido',
  expired_scan: 'Escaneo vencido',
  pending: 'Escaneo pendiente',
  rate_limited: 'Espera un momento',
};

type Sender = ProgressRepository['discover'];

function presentation(kind: ScanPresentation['kind'], message: string, extra?: Pick<ScanPresentation, 'pointsAwarded' | 'newSpecies'>): ScanPresentation {
  return { kind, title: TITLES[kind], message, ...extra };
}

export function createScanQueue(storage: KeyValueStorage, discover?: Sender) {
  const send = discover;

  async function read(): Promise<QueuedScan[]> {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedScan[];
    return Array.isArray(parsed) ? parsed : [];
  }

  async function write(items: QueuedScan[]) {
    if (items.length === 0) {
      await storage.removeItem(STORAGE_KEY);
      return;
    }
    await storage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  async function deliver(item: QueuedScan): Promise<ScanPresentation> {
    if (!send) {
      return presentation('pending', 'El escaneo queda pendiente hasta que haya conexión.');
    }
    try {
      const outcome = await send({
        code: item.code,
        scannedAt: item.scannedAt,
        clientScanId: item.clientScanId,
      });
      const current = await read();
      await write(current.filter((queued) => queued.clientScanId !== item.clientScanId));
      return presentation(outcome.result, outcome.message, {
        pointsAwarded: outcome.pointsAwarded,
        newSpecies: outcome.newSpecies,
      });
    } catch (error) {
      if (isOfflineError(error)) {
        return presentation('pending', 'Sin conexión. El escaneo sigue pendiente.');
      }
      if (isRateLimitError(error)) {
        return presentation('rate_limited', (error as ApiError).message);
      }
      throw error;
    }
  }

  return {
    async list(): Promise<QueuedScan[]> {
      return read();
    },
    async clear() {
      await storage.removeItem(STORAGE_KEY);
    },
    async enqueue(code: string, now: Date = new Date()): Promise<QueuedScan> {
      const item: QueuedScan = {
        code,
        scannedAt: now.toISOString(),
        clientScanId: createClientScanId(),
        pending: true,
      };
      await write([...(await read()), item]);
      return item;
    },
    async submit(code: string, now: Date = new Date()): Promise<ScanPresentation> {
      await this.enqueue(code, now);
      const results = await this.flush();
      return results.at(-1) ?? presentation('pending', 'El escaneo queda pendiente hasta que haya conexión.');
    },
    async flush(): Promise<ScanPresentation[]> {
      const results: ScanPresentation[] = [];
      const pending = await read();
      for (const item of pending) {
        const result = await deliver(item);
        results.push(result);
        if (result.kind === 'pending' || result.kind === 'rate_limited') break;
      }
      return results;
    },
    async retry(): Promise<ScanPresentation[]> {
      return this.flush();
    },
  };
}

function createClientScanId(): string {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const digit = char === 'x' ? value : (value & 0x3) | 0x8;
    return digit.toString(16);
  });
}

const memoryQueue = new MemoryKeyValueStorage();

export const scanQueue = createScanQueue(
  process.env.JEST_WORKER_ID === undefined ? defaultStorage : memoryQueue,
  progressRepository ? progressRepository.discover.bind(progressRepository) : undefined,
);

export async function submitScan(code: string): Promise<ScanPresentation> {
  return scanQueue.submit(code);
}

export async function clearScanQueue(): Promise<void> {
  await scanQueue.clear();
}
