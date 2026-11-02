import React from 'react';
import { render, fireEvent, act, renderHook, waitFor } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

describe('Map V2.1 — Ruta y Detección de Llegada (CA-12, CA-14)', () => {
  it('test-ca-14: muestra la línea discontinua hacia el recinto destino cuando hay posición y destino fijado', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 1320,
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

    expect(view.getByTestId('destination-route-line')).toBeTruthy();
  });

  it('test-ca-14-hidden: no muestra la línea de ruta si no hay destino seleccionado', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 1320,
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

    expect(view.queryByTestId('destination-route-line')).toBeNull();
  });

  it('test-ca-12: muestra el banner visual de llegada cuando arrivedAtPlace está presente y permite descartarlo', async () => {
    const onDismissArrival = jest.fn();

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
        arrivedAtPlace={tiger}
        onDismissArrival={onDismissArrival}
      />,
    );

    expect(view.getByTestId('arrival-banner')).toBeTruthy();
    expect(view.getByText('¡Llegaste a Hábitat del Tigre!')).toBeTruthy();

    fireEvent.press(view.getByText('Entendido'));
    expect(onDismissArrival).toHaveBeenCalledTimes(1);
  });

  it('test-ca-12-viewmodel: detecta llegada cuando la distancia es <= 10m y limpia destino', async () => {
    const { result } = await renderHook(() => useMapViewModel());

    // Esperamos a que el ViewModel cargue los lugares del repositorio
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fijamos destino en Juan (tigre)
    await act(async () => {
      result.current.setDestination('juan');
    });

    expect(result.current.destinationPlaceId).toBe('juan');
    expect(result.current.arrivedAtPlace).toBeNull();

    // Simulamos que el usuario está exactamente en las coordenadas del tigre
    const tigerLat = tiger.gpsLat ?? 20.0838;
    const tigerLon = tiger.gpsLon ?? -98.7236;

    await act(async () => {
      result.current.checkArrival(tigerLat, tigerLon);
    });

    // Debe haberse activado arrivedAtPlace y limpiado destinationPlaceId
    expect(result.current.arrivedAtPlace?.id).toBe('juan');
    expect(result.current.destinationPlaceId).toBeNull();

    // Descartamos llegada
    await act(async () => {
      result.current.dismissArrival();
    });

    expect(result.current.arrivedAtPlace).toBeNull();

    // Si volvemos a pasar por el mismo punto, no debe reaparecer en la misma sesión
    await act(async () => {
      result.current.checkArrival(tigerLat, tigerLon);
    });

    expect(result.current.arrivedAtPlace).toBeNull();
  });
});
