import React from 'react';
import { render } from '@testing-library/react-native';
import { AchievementsScreen } from '../../src/screens/AchievementsScreen';
import { countsFromCollection, mapAchievement, mapMission, profileDiscoveryCounts, type ProgressSnapshot } from '../../src/repositories/progressRepository';
import type { VisitorCatalogItemDto } from '@arca/api-client';

const achievement: VisitorCatalogItemDto = {
  code: 'bird-watcher',
  title: 'Observador de aves',
  description: 'Tres aves',
  icon: 'visibility',
  points: 200,
  rule_type: 'category_species_count',
  rule_target: 3,
  rule_param: 'bird',
  progress: 1,
  state: 'pending',
  earned_at: null,
};

const mission: VisitorCatalogItemDto = {
  code: 'safari-morning',
  title: 'Safari Matutino',
  description: 'Cinco especies',
  objective: 'Descubre cinco especies',
  icon: 'pets',
  points: 100,
  rule_type: 'species_count',
  rule_target: 5,
  progress: 1,
  state: 'pending',
  earned_at: null,
};

describe('test-ca-03-progress-achievements-missions', () => {
  it('CA-03 visitor-progress presenta el progreso que ya calculó el servidor', async () => {
    const mapped = mapAchievement(achievement);
    const mappedMission = mapMission(mission);
    expect(mapped.requirement).toBe('1 de 3');
    expect(mapped.action).toBe('Descubre tres especies de aves.');
    expect(mapped.unlocked).toBe(false);
    expect(mappedMission.progress).toBe(1);
    expect(mappedMission.total).toBe(5);
    expect(mappedMission.reward).toBe('100 puntos');

    const view = await render(
      <AchievementsScreen
        achievements={[
          { ...mapped, id: 'pending-bird' },
          {
            id: 'first-discovery',
            title: 'Primer descubrimiento',
            description: 'Listo',
            icon: 'pets',
            points: 100,
            action: '',
            requirement: '1 de 1',
            unlocked: true,
            earnedAt: '2026-10-22T12:00:00.000Z',
          },
        ]}
        source="profile"
        onAchievementPress={() => undefined}
        onBackPress={() => undefined}
      />,
    );
    expect(view.getByText('Primer descubrimiento')).toBeTruthy();
  });

  it('CA-03 visitor-progress abre los pendientes cuando no hay logros desbloqueados', async () => {
    const view = await render(
      <AchievementsScreen
        achievements={[mapAchievement(achievement)]}
        source="profile"
        onAchievementPress={() => undefined}
        onBackPress={() => undefined}
      />,
    );
    expect(view.getByText('Observador de aves')).toBeTruthy();
    expect(view.getByText('1 de 3')).toBeTruthy();
  });

  it('CA-01 el faltante cuenta las especies de la colección, no el total visitable', () => {
    const snapshot: ProgressSnapshot = {
      progress: {
        points: 0, level: 1, rank: 'Explorador', nextThreshold: null,
        discoveredSpecies: 0, totalSpecies: 1,
      },
      collection: [
        { id: 1, commonName: 'Jaguar', category: null, discovered: false, discoveredAt: null },
        { id: 2, commonName: 'León', category: null, discovered: false, discoveredAt: null },
        { id: 3, commonName: 'Guacamaya', category: null, discovered: false, discoveredAt: null },
        { id: 4, commonName: 'Cocodrilo', category: null, discovered: false, discoveredAt: null },
        { id: 5, commonName: 'Nutria', category: null, discovered: false, discoveredAt: null },
      ],
      achievements: [],
      missions: [],
    };
    expect(countsFromCollection(snapshot)).toEqual({ discovered: 0, total: 5 });
    expect(profileDiscoveryCounts({
      ...snapshot,
      progress: { ...snapshot.progress, discoveredSpecies: 1, totalSpecies: 2 },
    })).toEqual({ discovered: 1, total: 5 });
  });
});
