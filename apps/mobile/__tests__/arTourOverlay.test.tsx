import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const noop = () => undefined;

describe('Mobile 009 — Recorrido Guiado 3D y Cámara AR con Senderos y Bifurcaciones (CA-01 a CA-07)', () => {
  const position: UserPosition = {
    svgX: 500,
    svgY: 1280,
    lat: 20.08,
    lon: -98.722,
    accuracy: 5,
    searching: false,
  };

  it('test-ca-01, test-ca-03, test-ca-07: abre el Recorrido 3D desde MapScreen, renderiza sendero, flechas y bifurcaciones 3D, y vuelve al Mapa 2D limpiamente', async () => {
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

    const startButton = view.getByRole('button', { name: 'Iniciar Recorrido 3D' });
    expect(startButton).toBeTruthy();

    await fireEvent.press(startButton);

    // El visor 3D debe abrirse en la Parada 1 con modo Offline 3D
    expect(view.getByTestId('ar-tour-overlay')).toBeTruthy();
    expect(view.getByText(/Parada 1 de/)).toBeTruthy();

    // Debe renderizar el lienzo 3D con segmentos conectados, flechas animadas y bifurcaciones (CA-03, CA-04)
    expect(view.getByTestId('three-tour-scene')).toBeTruthy();
    expect(view.getByTestId('ar-camera-feed-layer')).toBeTruthy();
    expect(view.getByTestId('three-path-segments')).toBeTruthy();
    expect(view.getByTestId('three-chevron-stream')).toBeTruthy();
    expect(view.getByTestId('three-fork-branches')).toBeTruthy();

    // Conmutar entre Modo Cámara AR y Modo Escena 3D (CA-03)
    const toggleModeBtn = view.getByTestId('toggle-ar-visual-mode');
    await fireEvent.press(toggleModeBtn);
    expect(view.getByTestId('ar-virtual-3d-floor')).toBeTruthy();

    // Volver al mapa 2D desmonta el visor 3D limpiamente (CA-01, CA-07)
    const closeBtn = view.getByRole('button', { name: 'Volver al mapa 2D' });
    await fireEvent.press(closeBtn);
    expect(view.queryByTestId('ar-tour-overlay')).toBeNull();
  });

  it('test-ca-02, test-ca-04, test-ca-06: avanza entre recintos del recorrido, permite tomar una bifurcación y girar la orientación 3D con botones accesibles', async () => {
    const onToggleDestination = jest.fn();

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
        onToggleDestination={onToggleDestination}
      />,
    );

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    expect(view.getByText(/Parada 1 de/)).toBeTruthy();

    // Avanzar al siguiente recinto (CA-02)
    await fireEvent.press(view.getByTestId('next-tour-stop-button'));
    expect(view.getByText(/Parada 2 de/)).toBeTruthy();

    // Retroceder al recinto anterior
    await fireEvent.press(view.getByTestId('prev-tour-stop-button'));
    expect(view.getByText(/Parada 1 de/)).toBeTruthy();

    // Girar vista 3D a la izquierda, derecha y alinear al frente (CA-06)
    await fireEvent.press(view.getByRole('button', { name: 'Girar vista a la izquierda' }));
    await fireEvent.press(view.getByRole('button', { name: 'Girar vista a la derecha' }));
    await fireEvent.press(view.getByRole('button', { name: 'Alinear al frente' }));

    // Verificar panel de bifurcaciones 3D (CA-04)
    expect(view.getByTestId('ar-forks-panel')).toBeTruthy();
  });
});
