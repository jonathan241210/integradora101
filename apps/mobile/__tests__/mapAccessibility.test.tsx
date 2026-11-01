declare const __dirname: string;

import React from 'react';
import { render } from '@testing-library/react-native';
import { MapMarker } from '../src/components/map/MapMarker';
import { MapPlaceCard } from '../src/components/map/MapPlaceCard';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';

const fs = jest.requireActual<{
  readFileSync: (path: string, encoding: string) => string;
  readdirSync: (path: string) => string[];
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

describe('Map accessibility and architecture', () => {
  it('test-ca-07: las vistas del mapa no importan repositorios ni mocks', () => {
    const sourceRoot = path.join(__dirname, '..', 'src');
    const files = [
      path.join(sourceRoot, 'screens', 'MapScreen.tsx'),
      path.join(sourceRoot, 'components', 'map', 'ZooMapSvg.tsx'),
      path.join(sourceRoot, 'components', 'map', 'MapMarker.tsx'),
      path.join(sourceRoot, 'components', 'map', 'MapPlaceCard.tsx'),
    ];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*(?:repositories|mocks)(?:\/[^'"]*)?['"]/);
    }
  });

  it('test-ca-07: las vistas usan tokens y no colores fijos', () => {
    const sourceRoot = path.join(__dirname, '..', 'src');
    const files = [
      path.join(sourceRoot, 'screens', 'MapScreen.tsx'),
      path.join(sourceRoot, 'components', 'map', 'ZooMapSvg.tsx'),
      path.join(sourceRoot, 'components', 'map', 'MapMarker.tsx'),
      path.join(sourceRoot, 'components', 'map', 'MapPlaceCard.tsx'),
    ];

    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(source).not.toMatch(/\brgba?\(/);
    }
  });

  it('test-ca-07: el marcador expone nombre, rol y estado seleccionado en español', async () => {
    const view = await render(
      <MapMarker place={tiger} selected onPress={noop} />,
    );

    const marker = view.getByRole('button', { name: 'Hábitat del Tigre, Animal' });
    expect(marker.props.accessibilityState).toEqual({ selected: true });
  });

  it('test-ca-07: el detalle ofrece cierre accesible sin gestos obligatorios', async () => {
    const view = await render(
      <MapPlaceCard
        place={tiger}
        sectionName="Felinos"
        onClose={noop}
      />,
    );

    expect(view.getByText('Sección: Felinos')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Cerrar' })).toBeTruthy();
  });

  it('test-ca-08: cada criterio CA-01 a CA-08 aparece nombrado en una prueba de mapa', () => {
    const testDirectory = path.join(__dirname);
    const files = fs
      .readdirSync(testDirectory)
      .filter((name) => /^map.*\.test\.(ts|tsx)$/.test(name));
    const testSource = files
      .map((name) => fs.readFileSync(path.join(testDirectory, name), 'utf8'))
      .join('\n');

    for (let criterion = 1; criterion <= 8; criterion += 1) {
      expect(testSource).toMatch(new RegExp(`test-ca-0${criterion}`));
    }
  });
});
