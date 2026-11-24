import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const noop = () => undefined;

describe('Mobile 015 â€” AR location-based overlay (CA-01, CA-02, CA-07, CA-08)', () => {
  const position: UserPosition = {
    svgX: 500,
    svgY: 1280,
    lat: 20.08,
    lon: -98.722,
    accuracy: 5,
    searching: false,
    heading: 0,
  };

  it('test-ca-01: abre AR desde MapScreen y no muestra modo escena 3D sin cÃ¡mara', async () => {
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
      />,
    );

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(view.getByTestId('ar-tour-overlay')).toBeTruthy();
    expect(view.queryByTestId('toggle-ar-visual-mode')).toBeNull();
    expect(view.queryByTestId('ar-virtual-3d-floor')).toBeNull();
  });

  it('test-ca-02: el modo AR no renderiza la lÃ­nea/flechas SVG antiguas del overlay', async () => {
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
      />,
    );

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    expect(view.getByTestId('location-ar-scene')).toBeTruthy();
    expect(view.queryByTestId('three-path-segments')).toBeNull();
    expect(view.queryByTestId('three-chevron-stream')).toBeNull();
    expect(view.queryByTestId('ar-destination-route-line')).toBeNull();
  });

  it('test-ca-03: muestra puntos AR solo de recintos cercanos en el campo de visión', async () => {
    const nearbyEnclosure = {
      ...MOCK_MAP_PLACES.find((p) => p.kind === 'animal')!,
      id: 'nearby-enclosure',
      name: 'Recinto Cercano',
      gpsLat: 20.0804,
      gpsLon: -98.722,
      visible: true,
    };
    const view = await render(
      <MapScreen
        sections={MOCK_MAP_SECTIONS}
        filteredPlaces={[nearbyEnclosure]}
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
      />,
    );

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    expect(view.getByTestId('ar-point-enclosure-nearby-enclosure')).toBeTruthy();
  });

  it('test-ca-07, test-ca-08: cierra el AR y vuelve al mapa 2D sin bloquear la navegaciÃ³n', async () => {
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
      />,
    );

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    await fireEvent.press(view.getByRole('button', { name: 'Volver al mapa 2D' }));
    expect(view.queryByTestId('ar-tour-overlay')).toBeNull();
    expect(view.getByRole('button', { name: 'Iniciar AR' })).toBeTruthy();
  });
});
