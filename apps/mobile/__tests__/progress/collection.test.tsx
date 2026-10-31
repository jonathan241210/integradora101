import React from 'react';
import { render } from '@testing-library/react-native';
import { CollectionScreen } from '../../src/screens/CollectionScreen';
import { applySpeciesDiscovery } from '../../src/repositories/progressRepository';
import type { Animal } from '../../src/models';

const animals: Animal[] = [
  {
    id: 'tigre',
    nickname: 'Tigre',
    commonName: 'Tigre',
    scientificName: 'Panthera tigris',
    zone: 'Sabana',
    isDiscovered: false,
    placeholderTint: '#ccc',
  },
  {
    id: 'ave',
    nickname: 'Ave',
    commonName: 'Guacamaya',
    scientificName: 'Ara',
    zone: 'Aviario',
    isDiscovered: true,
    placeholderTint: '#ccc',
  },
];

describe('test-ca-02-progress-collection', () => {
  it('CA-02 visitor-progress lista descubiertas con fecha y conserva el bloqueo', async () => {
    const shown = applySpeciesDiscovery(animals, [
      { id: 1, commonName: 'Tigre', category: 'mammal', discovered: true, discoveredAt: '2026-10-22T12:00:00.000Z' },
      { id: 2, commonName: 'Guacamaya', category: 'bird', discovered: false, discoveredAt: null },
    ]);
    const view = await render(
      <CollectionScreen
        animals={shown}
        progress={{ discovered: 1, total: 2 }}
        onAnimalPress={() => undefined}
      />,
    );
    expect(view.getByText('✓ Descubierto · 2026-10-22T12:00:00.000Z')).toBeTruthy();
    expect(view.getByText('🔒 Bloqueado')).toBeTruthy();
    expect(view.getByLabelText('Vista previa de Guacamaya, por descubrir')).toBeTruthy();
  });
});
