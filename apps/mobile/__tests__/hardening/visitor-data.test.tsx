import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { accountSession } from '../../src/session/accountSession';
import type { ProgressRepository, ProgressSnapshot } from '../../src/repositories/progressRepository';
import {
  buildVisitorUser,
  FALLBACK_VISITOR_NAME,
  milestonesFromAchievements,
  MISSING_PROGRESS_SOURCE_MESSAGE,
  useUserViewModel,
} from '../../src/viewmodels/useUserViewModel';
import { VisitorDataGate } from '../../src/components/ui';
import { UserRepositoryImpl } from '../../src/repositories/userRepository';

const snapshot: ProgressSnapshot = {
  progress: { points: 120, level: 2, rank: 'Explorador', nextThreshold: 500, discoveredSpecies: 1, totalSpecies: 4 },
  collection: [
    { id: 1, commonName: 'Tigre', category: 'mammal', discovered: true, discoveredAt: '2026-11-01T10:00:00.000Z' },
  ],
  achievements: [
    {
      id: 'first', title: 'Primer paso', description: 'Descubre una especie', icon: 'pets', points: 10,
      action: 'Completaste el reto de este logro.', requirement: '1 de 1', unlocked: true, earnedAt: '2026-11-01T10:00:00.000Z',
    },
  ],
  missions: [
    { id: 'm1', title: 'Misión real', objective: 'Visita las aves', progress: 1, total: 3, reward: '30 puntos' },
  ],
};

function fakeRepository(load: () => Promise<ProgressSnapshot>): ProgressRepository {
  return {
    load,
    async discover() {
      throw new Error('fuera de este criterio');
    },
  };
}

function Probe({ source }: { source: ProgressRepository | null }) {
  const vm = useUserViewModel(undefined, source);
  return (
    <>
      <Text testID="status">{vm.status}</Text>
      <Text testID="name">{vm.user?.name ?? 'sin-usuario'}</Text>
      <Text testID="points">{String(vm.user?.points ?? 0)}</Text>
      <Text testID="missions">{vm.missions.map((m) => m.title).join('|')}</Text>
      <Text testID="achievements">{vm.achievements.map((a) => a.title).join('|')}</Text>
      <Text testID="milestones">{vm.milestones.map((m) => m.title).join('|')}</Text>
      <Text testID="collection">{String(vm.user?.discoveredCount ?? 0)}</Text>
      <Text testID="error">{vm.error ?? 'sin-error'}</Text>
      <Text testID="retry" onPress={() => { void vm.refresh(); }}>reintentar</Text>
    </>
  );
}

describe('mobile-018 datos reales del visitante', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('CA-03 con sesión muestra nombre, progreso, misiones, logros y colección de la API', async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
    jest.spyOn(accountSession, 'peekProfile').mockReturnValue({
      email: 'nita@ejemplo.com', firstName: 'Ana', nickname: 'Nita', avatarCode: 'wolf',
    });
    const view = await render(<Probe source={fakeRepository(async () => snapshot)} />);
    await waitFor(() => expect(view.getByTestId('status').props.children).toBe('ready'));
    expect(view.getByTestId('name').props.children).toBe('Nita');
    expect(view.getByTestId('points').props.children).toBe('120');
    expect(view.getByTestId('missions').props.children).toBe('Misión real');
    expect(view.getByTestId('achievements').props.children).toBe('Primer paso');
    expect(view.getByTestId('milestones').props.children).toBe('Primer paso');
    expect(view.getByTestId('collection').props.children).toBe('1');
    expect(view.queryByText('María García')).toBeNull();
  });

  it('CA-04 sin sesión el estado es guest y no hay datos inventados', async () => {
    await accountSession.resetForTests();
    await accountSession.bootstrap();
    const load = jest.fn(async () => snapshot);
    const view = await render(<Probe source={fakeRepository(load)} />);
    await waitFor(() => expect(view.getByTestId('status').props.children).toBe('guest'));
    expect(view.getByTestId('name').props.children).toBe('sin-usuario');
    expect(view.getByTestId('missions').props.children).toBe('');
    expect(view.getByTestId('achievements').props.children).toBe('');
    expect(load).not.toHaveBeenCalled();
  });

  it('CA-04 la compuerta sin sesión invita a iniciar sesión', async () => {
    const onLogin = jest.fn();
    const view = await render(
      <VisitorDataGate status="guest" title="Perfil" onLogin={onLogin} onRetry={jest.fn()}>
        <Text>contenido</Text>
      </VisitorDataGate>,
    );
    expect(view.queryByText('contenido')).toBeNull();
    await fireEvent.press(view.getByText('Iniciar sesión'));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('CA-05 un error de red muestra mensaje en español y reintentar vuelve a cargar', async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const load = jest.fn<Promise<ProgressSnapshot>, []>()
      .mockRejectedValueOnce(new Error('Network request failed'))
      .mockResolvedValue(snapshot);
    const view = await render(<Probe source={fakeRepository(load)} />);
    await waitFor(() => expect(view.getByTestId('status').props.children).toBe('error'));
    expect(view.getByTestId('error').props.children).toMatch(/No se pudo cargar tu progreso/);
    await act(async () => {
      await fireEvent.press(view.getByTestId('retry'));
    });
    await waitFor(() => expect(view.getByTestId('status').props.children).toBe('ready'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('CA-05 la compuerta con error ofrece Reintentar', async () => {
    const onRetry = jest.fn();
    const view = await render(
      <VisitorDataGate status="error" error="No se pudo cargar tu progreso." onLogin={jest.fn()} onRetry={onRetry}>
        <Text>contenido</Text>
      </VisitorDataGate>,
    );
    expect(view.getByText('No se pudo cargar tu progreso.')).toBeTruthy();
    await fireEvent.press(view.getByLabelText('Reintentar'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('CA-05 sin repositorio de progreso configurado muestra un error en español, no datos de demostración', async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const view = await render(<Probe source={null} />);
    await waitFor(() => expect(view.getByTestId('status').props.children).toBe('error'));
    expect(view.getByTestId('error').props.children).toBe(MISSING_PROGRESS_SOURCE_MESSAGE);
    expect(view.getByTestId('name').props.children).toBe('sin-usuario');
  });

  it('CA-03 el ViewModel usa el repositorio real por defecto cuando no hay mocks (sin datos de demostración)', async () => {
    const previous = process.env.EXPO_PUBLIC_USE_API;
    process.env.EXPO_PUBLIC_USE_API = 'true';
    try {
      await accountSession.resetForTests();
      await accountSession.login('correo@ejemplo.com', 'secreta');
      function DefaultProbe() {
        const vm = useUserViewModel();
        return <Text testID="default-name">{vm.user?.name ?? 'sin-usuario'}</Text>;
      }
      const view = await render(<DefaultProbe />);
      expect(view.getByTestId('default-name').props.children).toBe('sin-usuario');
    } finally {
      if (previous === undefined) delete process.env.EXPO_PUBLIC_USE_API;
      else process.env.EXPO_PUBLIC_USE_API = previous;
    }
  });

  it('CA-03 el nombre sale del apodo, luego del nombre y por último de «Visitante»', () => {
    expect(buildVisitorUser({ email: 'a@b.com', firstName: 'Ana', nickname: ' Nita ', avatarCode: 'wolf' }, snapshot).name)
      .toBe('Nita');
    expect(buildVisitorUser({ email: 'a@b.com', firstName: 'Ana', nickname: '', avatarCode: 'wolf' }, snapshot).name)
      .toBe('Ana');
    const anonymous = buildVisitorUser(null, snapshot);
    expect(anonymous.name).toBe(FALLBACK_VISITOR_NAME);
    expect(anonymous.points).toBe(120);
    expect(milestonesFromAchievements([
      ...snapshot.achievements,
      { ...snapshot.achievements[0], id: 'pending', unlocked: false, earnedAt: undefined },
    ])).toEqual([{ id: 'first', title: 'Primer paso', date: '2026-11-01T10:00:00.000Z' }]);
  });

  it('CA-08 con mocks habilitados (pruebas) el ViewModel sigue sirviendo datos de demostración', async () => {
    // Instancia estable: crearla en cada render cambiaría la dependencia del ViewModel y recargaría sin fin.
    const mockRepository = new UserRepositoryImpl();
    function MockProbe() {
      const vm = useUserViewModel(mockRepository);
      return <Text testID="mock-name">{vm.user?.name ?? 'cargando'}</Text>;
    }
    const view = await render(<MockProbe />);
    await waitFor(() => expect(view.getByTestId('mock-name').props.children).toBe('María García'));
  });
});
