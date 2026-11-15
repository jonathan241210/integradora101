import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import ProfileRoute from '../../src/app/(tabs)/profile';
import { ProfileScreen } from '../../src/screens/ProfileScreen';
import { accountSession } from '../../src/session/accountSession';
import { useUserViewModel } from '../../src/viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../src/viewmodels/useVisitorProgress';
import type { Achievement, User } from '../../src/models';
import type { ProgressRepository } from '../../src/repositories/progressRepository';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('../../src/repositories/progressRepository', () => ({
  progressRepository: {
    load: () => new Promise(() => undefined),
    discover: () => Promise.reject(new Error('fuera de este criterio')),
  },
  applySpeciesDiscovery: (animals: unknown) => animals,
}));

const repository: ProgressRepository = {
  async load() {
    return {
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
  },
  async discover() {
    throw new Error('fuera de este criterio');
  },
};

function Probe() {
  const { user } = useUserViewModel();
  const { snapshot } = useVisitorProgress(repository);
  if (!user || !snapshot) return <Text>cargando</Text>;
  return (
    <ProfileScreen
      user={{
        ...user,
        points: snapshot.progress.points,
        level: snapshot.progress.level,
        rank: snapshot.progress.rank,
        discoveredCount: snapshot.progress.discoveredSpecies,
        totalAnimals: snapshot.progress.totalSpecies,
      }}
      nextThreshold={snapshot.progress.nextThreshold}
      achievements={[]}
      onAchievementPress={() => undefined}
      onSeeAllAchievementsPress={() => undefined}
      onSettingsPress={() => undefined}
    />
  );
}

describe('test-ca-01-progress-profile', () => {
  beforeEach(async () => {
    await accountSession.resetForTests();
    await accountSession.login('correo@ejemplo.com', 'secreta');
  });

  it('CA-01 visitor-progress muestra puntos, nivel, rango, umbral y especies del servidor', async () => {
    const view = await render(<Probe />);
    await waitFor(() => expect(view.getByText('Explorador novato')).toBeTruthy());
    expect(view.getByText('100')).toBeTruthy();
    expect(view.getByText('1')).toBeTruthy();
    expect(view.getByText('1/4')).toBeTruthy();
    expect(view.getByText('Siguiente umbral: 500 puntos')).toBeTruthy();
    expect(view.getByText('Aún no tienes logros')).toBeTruthy();
  });

  it('CA-01 visitor-progress muestra Cargando perfil mientras el progreso no responde', async () => {
    const view = await render(<ProfileRoute />);
    expect(view.getByLabelText('Cargando perfil…')).toBeTruthy();
  });

  it('CA-01 visitor-progress muestra cinco logros recientes y deja el sexto fuera', async () => {
    const visitor: User = {
      id: '1',
      name: 'Ana',
      avatar: '',
      level: 1,
      rank: 'Explorador',
      points: 10,
      discoveredCount: 1,
      totalAnimals: 5,
    };
    const achievements: Achievement[] = Array.from({ length: 6 }, (_, index) => ({
      id: `logro-${index + 1}`,
      title: `Logro ${index + 1}`,
      description: '',
      icon: 'pets',
      points: 10,
      action: '',
      requirement: '',
      unlocked: true,
      earnedAt: `2026-11-0${index + 1}T12:00:00.000Z`,
    }));
    const view = await render(
      <ProfileScreen
        user={visitor}
        achievements={achievements}
        onAchievementPress={() => undefined}
        onSeeAllAchievementsPress={() => undefined}
        onSettingsPress={() => undefined}
      />,
    );
    expect(view.getByText('Logro 6')).toBeTruthy();
    expect(view.getByText('Logro 2')).toBeTruthy();
    expect(view.queryByText('Logro 1')).toBeNull();
    expect(StyleSheet.flatten(view.getByTestId('recent-achievements').props.style).maxHeight).toBe(232);
  });
});
