import React from 'react';
import { render } from '@testing-library/react-native';
import type { ApiError } from '@arca/api-client';
import { MemoryKeyValueStorage } from '../../src/repositories/storage';
import { createScanQueue } from '../../src/services/scanQueue';
import { GameScreen } from '../../src/screens/GameScreen';
import { accountSession } from '../../src/session/accountSession';
import { scanQueue } from '../../src/services/scanQueue';
import type { DiscoveryOutcome } from '../../src/repositories/progressRepository';

const progress: DiscoveryOutcome['progress'] = {
  points: 100,
  level: 1,
  rank: 'Explorador novato',
  nextThreshold: 500,
  discoveredSpecies: 1,
  totalSpecies: 4,
};

function outcome(result: DiscoveryOutcome['result'], code: string): DiscoveryOutcome {
  return {
    result,
    message: code,
    pointsAwarded: result === 'discovered' ? 100 : 0,
    newSpecies: result === 'discovered' ? ['Tigre'] : [],
    progress,
  };
}

function offline(): ApiError {
  const error = new Error('Sin conexión') as ApiError;
  error.name = 'ApiError';
  error.status = 0;
  return error;
}

function limited(): ApiError {
  const error = new Error('Espera 60 segundos e inténtalo de nuevo.') as ApiError;
  error.name = 'ApiError';
  error.status = 429;
  return error;
}

describe('progreso de la cola de escaneos', () => {
  it('CA-04 visitor-progress encola el escaneo sin conexión y lo muestra pendiente', async () => {
    const storage = new MemoryKeyValueStorage();
    const queue = createScanQueue(storage, async () => {
      throw offline();
    });
    const result = await queue.submit('ARCA-1');
    const pending = await queue.list();
    expect(result.kind).toBe('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].code).toBe('ARCA-1');
    expect(pending[0].pending).toBe(true);
    expect(pending[0].clientScanId).toMatch(/^[0-9a-f-]{36}$/i);
    const view = await render(
      <GameScreen
        missions={[]}
        achievements={[]}
        pendingScans={pending}
        onBackPress={() => undefined}
        onMissionPress={() => undefined}
        onAchievementPress={() => undefined}
      />,
    );
    expect(view.getByText('Pendiente')).toBeTruthy();
    expect(view.getByText('ARCA-1')).toBeTruthy();
  });

  it('CA-05 visitor-progress reenvía la cola en orden al volver, tras un envío o al reintentar', async () => {
    const storage = new MemoryKeyValueStorage();
    const seen: string[] = [];
    const queue = createScanQueue(storage, async (input) => {
      seen.push(input.code);
      return outcome('discovered', input.code);
    });
    await queue.enqueue('primero');
    await queue.enqueue('segundo');
    await queue.flush();
    expect(seen).toEqual(['primero', 'segundo']);
    await queue.enqueue('tercero');
    await queue.submit('cuarto');
    expect(seen.slice(2)).toEqual(['tercero', 'cuarto']);
    await queue.enqueue('quinto');
    await queue.retry();
    expect(seen.at(-1)).toBe('quinto');
  });

  it('CA-06 visitor-progress retira el resultado y conserva el fallo de red', async () => {
    const storage = new MemoryKeyValueStorage();
    let online = false;
    const queue = createScanQueue(storage, async (input) => {
      if (!online) throw offline();
      return outcome(input.code === 'malo' ? 'invalid_code' : 'discovered', input.code);
    });
    await queue.submit('bueno');
    expect(await queue.list()).toHaveLength(1);
    online = true;
    const flushed = await queue.flush();
    expect(flushed[0].kind).toBe('discovered');
    expect(await queue.list()).toHaveLength(0);

    await queue.submit('malo');
    expect((await queue.list())).toHaveLength(0);

    online = false;
    const limitedQueue = createScanQueue(storage, async () => {
      throw limited();
    });
    const waiting = await limitedQueue.submit('tarde');
    expect(waiting.kind).toBe('rate_limited');
    expect(waiting.message).toContain('Espera');
    expect(await limitedQueue.list()).toHaveLength(1);
  });
});

describe('la cuenta limpia la cola', () => {
  it('CA-04 visitor-progress vacía la cola al borrar la cuenta', async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
    await scanQueue.clear();
    await scanQueue.enqueue('ARCA-LOCAL');
    expect(await scanQueue.list()).toHaveLength(1);
    await accountSession.deleteAccount('secreta');
    expect(await scanQueue.list()).toHaveLength(0);
  });
});
