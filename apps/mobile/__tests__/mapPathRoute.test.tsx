import React from 'react';
import { render } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

describe('Map V3 — Polilínea por Senderos e Insignia de Caminata en Pantalla (CA-20)', () => {
  it('test-ca-20: renderiza la polilínea multi-segmento sobre los senderos y el WalkEstimateBadge cuando hay destino activo', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 1280,
      lat: 20.08,
      lon: -98.722,
      accuracy: 5,
      searching: false,
    };

    const view = await render(
      <MapScreen
        sections={MOCK_MAP_SECTIONS}
        filteredPlaces={MOCK_MAP_PLACES}
        filter="all"
        selectedPlace={null}
        focusedSectionId={null}
        focusedPlaceId={null}
        focusNotFound={false}
        isLoading={false}
        error={null}
        onFilterChange={noop}
        onSelectPlace={noop}
        onCloseDetail={noop}
        onRetry={noop}
        onSearchPress={noop}
        userPosition={position}
        destinationPlace={tiger}
      />,
    );

    const routeSvg = view.getByTestId('destination-route-line');
    const polyline = view.getByTestId('destination-route-polyline');
    expect(routeSvg).toBeTruthy();
    expect(polyline).toBeTruthy();

    // La polilínea debe tener múltiples vértices intermedios de los pasillos (no solo inicio y fin)
    const pointsProp = String(routeSvg.props.accessibilityLabel ?? '');
    expect(pointsProp.split(' ').length).toBeGreaterThan(4);

    // La insignia de caminata debe mostrar el nombre del destino, metros y minutos a pie
    const badge = view.getByTestId('walk-estimate-badge');
    expect(badge).toBeTruthy();
    expect(view.getByText('Ruta a Hábitat del Tigre')).toBeTruthy();
    expect(view.getByText(/min a pie/)).toBeTruthy();
  });

  it('test-ca-20-hidden: oculta la polilínea y el WalkEstimateBadge cuando se cancela el destino', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 1280,
      lat: 20.08,
      lon: -98.722,
      accuracy: 5,
      searching: false,
    };

    const view = await render(
      <MapScreen
        sections={MOCK_MAP_SECTIONS}
        filteredPlaces={MOCK_MAP_PLACES}
        filter="all"
        selectedPlace={null}
        focusedSectionId={null}
        focusedPlaceId={null}
        focusNotFound={false}
        isLoading={false}
        error={null}
        onFilterChange={noop}
        onSelectPlace={noop}
        onCloseDetail={noop}
        onRetry={noop}
        onSearchPress={noop}
        userPosition={position}
        destinationPlace={null}
      />,
    );

    expect(view.queryByTestId('destination-route-polyline')).toBeNull();
    expect(view.queryByTestId('walk-estimate-badge')).toBeNull();
  });
});
