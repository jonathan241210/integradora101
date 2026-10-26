import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import type { ProgressRepository, ProgressSnapshot } from '../../src/repositories/progressRepository';
import { accountSession } from '../../src/session/accountSession';
import { useVisitorProgress } from '../../src/viewmodels/useVisitorProgress';

const baseSnapshot: ProgressSnapshot = {
  progress: {
    points: 100,
    level: 1,
    rank: 'Explorador novato',
    nextThreshold: 500,
    discoveredSpecies: 1,
    totalSpecies: 4,
  },
  collection: [],
  achievements: [],
  missions: [],
};

function withPoints(points: number): ProgressSnapshot {
  return { ...baseSnapshot, progress: { ...baseSnapshot.progress, points } };
}

function Panel({ repository, name }: { repository: ProgressRepository; name: string }) {
  const { snapshot, loading } = useVisitorProgress(repository);
  if (loading && !snapshot) return <Text>{`${name}:cargando`}</Text>;
  return <Text>{`${name}:${snapshot?.progress.points ?? 'vacio'}`}</Text>;
}

describe('una sola lectura de progreso', () => {
  beforeEach(async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
  });

  it('CA-01 visitor-progress dos pantallas con el mismo repositorio disparan load una vez', async () => {
    let resolveLoad: (value: ProgressSnapshot) => void = () => undefined;
    const load = jest.fn(() => new Promise<ProgressSnapshot>((resolve) => {
      resolveLoad = resolve;
    }));
    const repository: ProgressRepository = {
      load,
      async discover() {
        throw new Error('fuera de este criterio');
      },
    };

    function Harness({ extra }: { extra: boolean }) {
      return (
        <>
          <Panel repository={repository} name="perfil" />
          <Panel repository={repository} name="coleccion" />
          {extra ? <Panel repository={repository} name="logros" /> : null}
        </>
      );
    }

    const view = await render(<Harness extra={false} />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1));

    await act(async () => {
      resolveLoad(withPoints(100));
    });
    await waitFor(() => {
      expect(view.getByText('perfil:100')).toBeTruthy();
      expect(view.getByText('coleccion:100')).toBeTruthy();
    });

    view.rerender(<Harness extra />);
    await waitFor(() => expect(view.getByText('logros:100')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('CA-01 visitor-progress un aviso de updateProfile no dispara otro load', async () => {
    const load = jest.fn(async () => withPoints(100));
    const repository: ProgressRepository = {
      load,
      async discover() {
        throw new Error('fuera de este criterio');
      },
    };

    const view = await render(
      <>
        <Panel repository={repository} name="perfil" />
        <Panel repository={repository} name="coleccion" />
      </>,
    );
    await waitFor(() => expect(view.getByText('perfil:100')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      await accountSession.updateProfile({
        firstName: 'Ana',
        nickname: 'Anita',
        avatarCode: 'jaguar',
      });
    });

    expect(load).toHaveBeenCalledTimes(1);
    expect(view.getByText('perfil:100')).toBeTruthy();
    expect(view.getByText('coleccion:100')).toBeTruthy();
  });

  it('CA-01 visitor-progress al cerrar sesión descarta la copia y la cuenta siguiente vuelve a leer', async () => {
    const load = jest.fn()
      .mockResolvedValueOnce(withPoints(100))
      .mockResolvedValueOnce(withPoints(240));
    const repository: ProgressRepository = {
      load,
      async discover() {
        throw new Error('fuera de este criterio');
      },
    };

    const view = await render(<Panel repository={repository} name="perfil" />);
    await waitFor(() => expect(view.getByText('perfil:100')).toBeTruthy());

    await act(async () => {
      await accountSession.logout();
      await accountSession.login('maria@correo.com', 'secreta');
    });

    await waitFor(() => expect(view.getByText('perfil:240')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('CA-01 visitor-progress refresh vuelve a leer a propósito', async () => {
    const load = jest.fn()
      .mockResolvedValueOnce(withPoints(100))
      .mockResolvedValueOnce(withPoints(180));
    const repository: ProgressRepository = {
      load,
      async discover() {
        throw new Error('fuera de este criterio');
      },
    };

    function Probe() {
      const progress = useVisitorProgress(repository);
      const label = progress.loading && !progress.snapshot
        ? 'cargando'
        : String(progress.snapshot?.progress.points ?? 'vacio');
      return (
        <>
          <Text>{label}</Text>
          <Text onPress={() => { void progress.refresh(); }}>Refrescar</Text>
        </>
      );
    }

    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText('100')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(1);

    await act(async () => {
      fireEvent.press(view.getByText('Refrescar'));
    });

    await waitFor(() => expect(view.getByText('180')).toBeTruthy());
    expect(load).toHaveBeenCalledTimes(2);
  });
});
