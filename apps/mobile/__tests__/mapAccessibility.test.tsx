declare const __dirname: string;

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { MapMarker } from '../src/components/map/MapMarker';
import { MapPlaceCard } from '../src/components/map/MapPlaceCard';
import { ZooMapSvg } from '../src/components/map/ZooMapSvg';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import { colors } from '../src/theme/tokens';
import { toZooPlaceMarker } from '../src/viewmodels/useMapMarkers';

const fs = jest.requireActual<{
  readFileSync: (path: string, encoding: string) => string;
  readdirSync: (path: string) => string[];
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

describe('Map accessibility and architecture', () => {
  it('mobile-017 CA-13: solo los servicios son vino y todos los puntos comparten el halo azul', async () => {
    const locations = ['common_area', 'landmark', 'restroom', 'food', 'ticketing'].map((placeType, index) =>
      toZooPlaceMarker({
        id: String(index), name: placeType, placeType, mapX: 0.4 + index * 0.07, mapY: 0.6, isVisible: true,
      })!,
    );
    const localFood = MOCK_MAP_PLACES.find((place) => place.id === 'food-court')!;
    const places = [tiger, ...locations, localFood];
    const view = await render(<ZooMapSvg places={places} />);
    const circles = () => view.getByTestId('zoo-map-svg').queryAll((node) => node.type === 'RNSVGCircle');
    const brush = (color: string) => ({ type: 0, payload: processColor(color) });
    expect(circles().filter((circle) => Number(circle.props.r) === 9).map((circle) => circle.props.stroke))
      .toEqual([
        brush(colors.enclosure), brush(colors.enclosure), brush(colors.enclosure),
        brush(colors.base), brush(colors.base), brush(colors.base), brush(colors.base),
      ]);

    for (const place of [tiger, locations[2]]) {
      await view.rerender(<ZooMapSvg places={places} selectedPlaceId={place.id} />);
      const halo = circles().filter((circle) => Number(circle.props.r) === 16);
      expect(halo).toHaveLength(1);
      expect(halo[0].props.stroke).toEqual(brush(colors.info));
      expect(Number(halo[0].props.cx)).toBeCloseTo(place.mapX * 1600);
    }
  });

  it('mobile-017 CA-11: oculta la etiqueta en el plano y conserva el botón accesible', async () => {
    const onPress = jest.fn();
    const view = await render(
      <>
        <ZooMapSvg places={[tiger]} />
        <MapMarker place={tiger} onPress={onPress} />
      </>,
    );
    const svg = view.getByTestId('zoo-map-svg');
    expect(svg.queryAll((node) => node.type === 'RNSVGCircle')).toHaveLength(2);
    expect(svg.queryAll((node) => node.type === 'RNSVGText')).toHaveLength(0);
    await fireEvent.press(view.getByRole('button', { name: 'Hábitat del Tigre, Animal' }));
    expect(onPress).toHaveBeenCalledWith(tiger.id);
  });

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

  it('test-ca-07, mobile-017 CA-13: el detalle se despliega, pliega y cierra con botones accesibles', async () => {
    const close = jest.fn();
    const toggle = jest.fn();
    const card = (expanded: boolean) => (
      <MapPlaceCard
        place={tiger}
        sectionName="Felinos"
        expanded={expanded}
        onToggleExpanded={toggle}
        onClose={close}
      />
    );
    const view = await render(card(false));

    const expand = view.getByRole('button', { name: 'Ver detalles' });
    expect(expand.props.accessibilityState).toEqual({ expanded: false });
    expect(view.queryByText('Sección: Felinos')).toBeNull();
    await fireEvent.press(expand);
    expect(toggle).toHaveBeenCalledTimes(1);
    await view.rerender(card(true));
    const collapse = view.getByRole('button', { name: 'Ver menos' });
    expect(collapse.props.accessibilityState).toEqual({ expanded: true });
    expect(view.getByText('Sección: Felinos')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
    await fireEvent.press(collapse);
    expect(toggle).toHaveBeenCalledTimes(2);
    await view.rerender(card(false));
    expect(view.queryByText('Sección: Felinos')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Cerrar' }));
    expect(close).toHaveBeenCalledTimes(1);
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
