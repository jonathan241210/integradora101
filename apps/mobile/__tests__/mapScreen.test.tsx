import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MapMarker } from '../src/components/map/MapMarker';
import { MapPlace } from '../src/models';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { MapRepository } from '../src/repositories';
import { LiveMap } from '../test-support/mapHarness';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

const emptyRepository: MapRepository = {
  getPlaces: async () => [],
  getSections: async () => MOCK_MAP_SECTIONS,
};

function createFlakyRepository(): MapRepository {
  let attempts = 0;
  return {
    getPlaces: async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error('repositorio no disponible');
      }
      return MOCK_MAP_PLACES;
    },
    getSections: async () => MOCK_MAP_SECTIONS,
  };
}

function DetailHarness() {
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

  return (
    <MapScreen
      sections={MOCK_MAP_SECTIONS}
      filteredPlaces={MOCK_MAP_PLACES}
      filter="all"
      selectedPlace={selectedPlace}
      focusedSectionId={null}
      focusedPlaceId={null}
      focusNotFound={false}
      isLoading={false}
      error={null}
      onFilterChange={noop}
      onSelectPlace={(id) => setSelectedPlace(MOCK_MAP_PLACES.find((place) => place.id === id) ?? null)}
      onCloseDetail={() => setSelectedPlace(null)}
      onRetry={noop}
      onSearchPress={noop}
    />
  );
}

describe('MapScreen', () => {
  it('test-ca-01: muestra el SVG esquemático con secciones y acceso', async () => {
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

    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
    expect(view.getByText('Mapa del zoológico')).toBeTruthy();
    expect(view.getByLabelText(/Mapa esquemático del zoológico con secciones/)).toBeTruthy();
    expect(view.getByText('Toca un punto del mapa para ver su información.')).toBeTruthy();
    expect(view.queryByText('8 min')).toBeNull();
    expect(view.queryByText('450 m')).toBeNull();
  });

  it('test-ca-02: posiciona cada marcador con mapX y mapY normalizados', async () => {
    const onPress = jest.fn();
    const view = await render(<MapMarker place={tiger} onPress={onPress} />);
    const marker = view.getByTestId('map-marker-juan');
    const style = StyleSheet.flatten(marker.props.style);

    expect(style.left).toBe('23%');
    expect(style.top).toBe('25%');

    await fireEvent.press(marker);
    expect(onPress).toHaveBeenCalledWith('juan');
  });

  it('test-ca-03: abre el detalle al tocar un marcador y lo cierra sin ocultar el mapa', async () => {
    const view = await render(<DetailHarness />);

    await fireEvent.press(view.getByTestId('map-marker-juan'));

    expect(view.getByText('Sección: Felinos')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();

    await fireEvent.press(view.getByText('Cerrar'));

    expect(view.queryByText('Recinto de Juan, el tigre de Bengala.')).toBeNull();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
  });

  it('test-ca-04: filtra animales y servicios sin romper el mapa', async () => {
    const view = await render(<LiveMap />);
    await waitFor(() => expect(view.getByTestId('map-marker-juan')).toBeTruthy());

    await fireEvent.press(view.getByText('Servicios'));
    expect(view.queryByTestId('map-marker-juan')).toBeNull();
    expect(view.getByTestId('map-marker-restrooms')).toBeTruthy();

    await fireEvent.press(view.getByText('Animales'));
    expect(view.queryByTestId('map-marker-restrooms')).toBeNull();
    expect(view.getByTestId('map-marker-juan')).toBeTruthy();

    await fireEvent.press(view.getByText('Todo'));
    expect(view.getByTestId('map-marker-juan')).toBeTruthy();
    expect(view.getByTestId('map-marker-restrooms')).toBeTruthy();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
  });

  it('test-ca-04: muestra un estado vacío en español si el filtro no tiene resultados', async () => {
    const view = await render(<LiveMap repository={emptyRepository} />);

    await waitFor(() => expect(view.getByText('No hay puntos para este filtro')).toBeTruthy());
    expect(view.getByText('Prueba con otro filtro para ver los puntos disponibles.')).toBeTruthy();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
  });

  it('test-ca-05: enfoca el marcador y la sección del destino desde la búsqueda', async () => {
    const view = await render(<LiveMap focus="juan" />);
    await waitFor(() => expect(view.getByTestId('map-marker-juan')).toBeTruthy());

    expect(view.getByTestId('map-marker-juan').props.accessibilityState).toEqual({ selected: true });
    expect(view.getByTestId('map-zone-highlight-zone-felines')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
    expect(view.queryByText('8 min')).toBeNull();
    expect(view.queryByText('450 m')).toBeNull();
    expect(view.queryByText('Noroeste')).toBeNull();
  });

  it('test-ca-05: avisa cuando el destino no existe en el mapa', async () => {
    const view = await render(<LiveMap focus="missing-place" />);

    await waitFor(() => expect(view.getByText('No encontramos ese destino en el mapa.')).toBeTruthy());
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
  });

  it('test-ca-06: muestra error en español, conserva el SVG y permite reintentar', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const repository = createFlakyRepository();
    const view = await render(<LiveMap repository={repository} />);

    await waitFor(() => expect(view.getByText('No se pudo cargar el mapa')).toBeTruthy());
    expect(view.getByText('No se pudo cargar el mapa. Intenta de nuevo.')).toBeTruthy();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();

    await fireEvent.press(view.getByText('Reintentar'));
    await waitFor(() => expect(view.getByTestId('map-marker-juan')).toBeTruthy());
    jest.restoreAllMocks();
  });

  // Pruebas añadidas para V2 (T-29, T-30, T-31, T-32)
  it('test-ca-08: permiso denegado no muestra punto azul en el mapa', async () => {
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
        userPosition={null}
      />,
    );

    expect(view.queryByTestId('user-location-marker')).toBeNull();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();
  });

  it('test-ca-09: con señal GPS buena muestra el punto azul sin anillo pulsante de búsqueda', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 700,
      lat: 20.0825,
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
      />,
    );

    expect(view.getByTestId('user-location-marker')).toBeTruthy();
    expect(view.queryByTestId('location-searching')).toBeNull();
  });

  it('test-ca-10: buscando señal muestra el punto azul con indicador pulsante', async () => {
    const position: UserPosition = {
      svgX: 500,
      svgY: 1320,
      lat: 20.08,
      lon: -98.722,
      accuracy: 50,
      searching: true,
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
      />,
    );

    expect(view.getByTestId('user-location-marker')).toBeTruthy();
    expect(view.getByTestId('location-searching')).toBeTruthy();
  });

  it('test-ca-13: modo degradado sin ubicación mantiene filtros y foco intactos', async () => {
    const view = await render(<LiveMap focus="juan" />);
    await waitFor(() => expect(view.getByTestId('map-marker-juan')).toBeTruthy());

    expect(view.queryByTestId('user-location-marker')).toBeNull();
    expect(view.getByTestId('map-zone-highlight-zone-felines')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
  });
});
