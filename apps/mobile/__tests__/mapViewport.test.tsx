import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { PanResponder, StyleSheet } from 'react-native';
import type { GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import {
  clampPan,
  clampZoom,
  centerMap,
} from '../src/utils/mapViewport';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const noop = () => undefined;
const layout = { width: 320, height: 320, x: 0, y: 0 };
const gestureState = { dx: 0, dy: 0 } as PanResponderGestureState;

function touches(...points: [number, number][]) {
  return {
    nativeEvent: {
      touches: points.map(([pageX, pageY], identifier) => ({ pageX, pageY, identifier: String(identifier) })),
    },
  } as unknown as GestureResponderEvent;
}

describe('Map V2.2 — Controles Interactivos de Zoom, Desplazamiento y Centrado (CA-15, CA-16, CA-17)', () => {
  it('test-ca-15: los controles accesibles acercan, alejan y restablecen el mapa entre 1× y 4×', async () => {
    expect(clampZoom(0.5)).toBe(1);
    expect(clampZoom(1.5)).toBe(1.5);
    expect(clampZoom(5)).toBe(4);

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

    // Zoom inicial más cercano para legibilidad del mapa canónico
    expect(view.getByText('2.2x')).toBeTruthy();
    expect(zoomOutButton.props.accessibilityState).toEqual({ disabled: false });

    // Acercar y alejar
    await fireEvent.press(zoomInButton);
    expect(view.getByText('2.7x')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Alejar mapa' }));
    expect(view.getByText('2.2x')).toBeTruthy();

    // Restablecer vuelve al zoom inicial
    await fireEvent.press(resetButton);
    expect(view.getByText('2.2x')).toBeTruthy();
  });

  it('test-ca-16: el desplazamiento del lienzo se acota a los bordes (clampPan) y se mantiene en (0, 0) a escala 1.0x', () => {
    expect(clampPan(120, -90, 1, layout)).toEqual({ panX: 0, panY: 0 });
    expect(clampPan(999, -999, 2, layout)).toEqual({ panX: 160, panY: -80 });
    expect(clampPan(45, -60, 2, layout)).toEqual({ panX: 45, panY: -60 });
  });

  it('mobile-017 CA-14: ancla el gesto de dos dedos, acota la escala y continúa con un dedo', async () => {
    const responder = jest.spyOn(PanResponder, 'create');
    const closeDetail = jest.fn();
    try {
      const view = await render(
        <MapScreen
          sections={MOCK_MAP_SECTIONS}
          filteredPlaces={MOCK_MAP_PLACES}
          filter="all"
          selectedPlace={MOCK_MAP_PLACES[0]}
          focusedSectionId={null}
          focusedPlaceId={null}
          focusNotFound={false}
          isLoading={false}
          error={null}
          onFilterChange={noop}
          onSelectPlace={noop}
          onCloseDetail={closeDetail}
          onRetry={noop}
          onSearchPress={noop}
        />,
      );
      await act(async () => view.getByTestId('map-viewport-gesture-area').props.onLayout({ nativeEvent: { layout } }));
      const reset = view.getByRole('button', { name: 'Restablecer vista del mapa' });
      await fireEvent.press(reset);
      const transform = () => StyleSheet.flatten(view.getByTestId('map-viewport-content').props.style).transform;
      const [gesture] = responder.mock.calls.at(-1)!;
      const singleTouch = touches([140, 140]);
      const twoTouches = touches([140, 140], [240, 140]);
      expect(gesture.onStartShouldSetPanResponderCapture!(singleTouch, gestureState)).toBe(false);
      expect(gesture.onMoveShouldSetPanResponderCapture!(singleTouch, gestureState)).toBe(false);
      expect(gesture.onStartShouldSetPanResponderCapture!(twoTouches, gestureState)).toBe(true);
      expect(gesture.onMoveShouldSetPanResponderCapture!(twoTouches, gestureState)).toBe(true);
      expect(gesture.onMoveShouldSetPanResponderCapture!(singleTouch, { ...gestureState, dx: 5 })).toBe(true);

      await act(async () => {
        gesture.onPanResponderGrant!(twoTouches, gestureState);
        gesture.onPanResponderMove!(touches([115, 140], [265, 140]), gestureState);
      });
      expect(transform()).toEqual([{ translateX: -15 }, { translateY: 10 }, { scale: expect.closeTo(3.3) }]);

      await act(async () => {
        gesture.onPanResponderEnd!(touches([115, 140]), gestureState);
        gesture.onPanResponderMove!(touches([135, 140]), gestureState);
      });
      expect(transform()).toEqual([{ translateX: 5 }, { translateY: 10 }, { scale: expect.closeTo(3.3) }]);

      await act(async () => {
        gesture.onPanResponderStart!(twoTouches, gestureState);
        gesture.onPanResponderMove!(touches([50, 140], [330, 140]), gestureState);
      });
      expect(view.getByRole('button', { name: 'Acercar mapa' }).props.accessibilityState.disabled).toBe(true);
      expect(view.getByText('4x')).toBeTruthy();

      await act(async () => {
        gesture.onPanResponderMove!(touches([189, 140], [191, 140]), gestureState);
        gesture.onPanResponderRelease!(touches(), gestureState);
      });
      expect(transform()).toEqual([{ translateX: 0 }, { translateY: 0 }, { scale: 1 }]);
      expect(view.getByRole('button', { name: 'Alejar mapa' }).props.accessibilityState.disabled).toBe(true);
      await fireEvent.press(reset);
      expect(view.getByText('2.2x')).toBeTruthy();

      const beforeInterruptedGesture = transform();
      await act(async () => {
        gesture.onPanResponderMove!(touches(), gestureState);
        gesture.onPanResponderMove!(singleTouch, gestureState);
        gesture.onPanResponderStart!(touches([140, 140], [140, 140]), gestureState);
        gesture.onPanResponderMove!(twoTouches, gestureState);
      });
      expect(transform()).toEqual(beforeInterruptedGesture);

      const resize = view.getByTestId('map-viewport-gesture-area').props.onLayout;
      await act(async () => {
        resize({ nativeEvent: { layout: { ...layout, width: 0 } } });
        resize({ nativeEvent: { layout: { ...layout, height: 0 } } });
        resize({ nativeEvent: { layout: { ...layout, height: 240 } } });
        resize({ nativeEvent: { layout: { ...layout, height: 240 } } });
      });
      expect(transform()).toEqual(beforeInterruptedGesture);
      expect(view.getByRole('button', { name: 'Ver detalles' })).toBeTruthy();
      expect(closeDetail).not.toHaveBeenCalled();
    } finally {
      responder.mockRestore();
    }
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

    const centerOffset = centerMap(230, 350, 2, layout);
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
    await act(async () => viewWithGps.getByTestId('map-viewport-gesture-area').props.onLayout({ nativeEvent: { layout } }));

    // Al presionar, aplica zoom (2x) y traslada el contenedor hacia el punto azul
    await fireEvent.press(centerButton);
    expect(viewWithGps.getByText('2x')).toBeTruthy();

    const viewport = viewWithGps.getByTestId('map-viewport-content');
    expect(viewport.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transform: [
            { translateX: centerOffset.panX },
            { translateY: centerOffset.panY },
            { scale: 2 },
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
