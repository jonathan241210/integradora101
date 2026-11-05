import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import {
  clampPan,
  clampZoom,
  computeCenterPanForSvgPoint,
} from '../src/utils/mapViewport';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const noop = () => undefined;

describe('Map V2.2 — Controles Interactivos de Zoom, Desplazamiento y Centrado (CA-15, CA-16, CA-17)', () => {
  it('test-ca-15: los controles accesibles acercan, alejan y restablecen la vista del mapa entre 1.0x y 2.5x', async () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(1.5)).toBe(1.5);
    expect(clampZoom(4.0)).toBe(2.5);

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
      />,
    );

    const zoomInButton = view.getByRole('button', { name: 'Acercar mapa' });
    const zoomOutButton = view.getByRole('button', { name: 'Alejar mapa' });
    const resetButton = view.getByRole('button', { name: 'Restablecer vista del mapa' });

    // En 1x el botón de alejar está deshabilitado
    expect(zoomOutButton.props.accessibilityState).toEqual({ disabled: true });
    expect(view.getByText('1x')).toBeTruthy();

    // Acercamos a 1.5x y 2x
    await fireEvent.press(zoomInButton);
    expect(view.getByText('1.5x')).toBeTruthy();

    await fireEvent.press(zoomInButton);
    expect(view.getByText('2x')).toBeTruthy();

    // Alejamos a 1.5x
    await fireEvent.press(view.getByRole('button', { name: 'Alejar mapa' }));
    expect(view.getByText('1.5x')).toBeTruthy();

    // Restablecemos a 1x
    await fireEvent.press(resetButton);
    expect(view.getByText('1x')).toBeTruthy();
  });

  it('test-ca-16: el desplazamiento del lienzo se acota a los bordes (clampPan) y se mantiene en (0, 0) a escala 1.0x', () => {
    // En 1.0x cualquier intento de pan devuelve (0, 0)
    expect(clampPan(120, -90, 1.0)).toEqual({ panX: 0, panY: 0 });

    // En 2.0x acota valores extremos dentro del límite permitido
    const clamped = clampPan(999, -999, 2.0, 180);
    expect(clamped.panX).toBe(180);
    expect(clamped.panY).toBe(-252);

    // Valores dentro del rango se preservan
    expect(clampPan(45, -60, 2.0, 180)).toEqual({ panX: 45, panY: -60 });
  });

  it('test-ca-17: centra el visor en la ubicación del visitante cuando hay GPS activo y oculta el botón sin GPS', async () => {
    const position: UserPosition = {
      svgX: 230,
      svgY: 350,
      lat: 20.0838,
      lon: -98.7236,
      accuracy: 5,
      searching: false,
    };

    const centerOffset = computeCenterPanForSvgPoint(230, 350, 2.0, 180);
    expect(centerOffset.panX).toBeGreaterThan(0);
    expect(centerOffset.panY).toBeGreaterThan(0);

    // Con GPS activo muestra el botón "Centrar en mi ubicación"
    const viewWithGps = await render(
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

    const centerButton = viewWithGps.getByRole('button', {
      name: 'Centrar en mi ubicación',
    });
    expect(centerButton).toBeTruthy();

    // Al presionar, aplica zoom (2x) y traslada el contenedor hacia el punto azul
    await fireEvent.press(centerButton);
    expect(viewWithGps.getByText('2x')).toBeTruthy();

    const viewport = viewWithGps.getByTestId('map-viewport-content');
    expect(viewport.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transform: [
            { scale: 2 },
            { translateX: centerOffset.panX },
            { translateY: centerOffset.panY },
          ],
        }),
      ]),
    );

    // Sin GPS activo no se renderiza el botón de centrar ubicación
    const viewWithoutGps = await render(
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
        userPosition={null}
      />,
    );

    expect(viewWithoutGps.queryByTestId('map-center-location')).toBeNull();
  });
});
