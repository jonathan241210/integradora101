import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { MapScreen } from '../src/screens/MapScreen';
import { MapMarker } from '../src/components/map/MapMarker';
import { MapPlace, ZooPlace } from '../src/models';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { MapRepository } from '../src/repositories';
import { mapZooPlaceToModel } from '../src/repositories/mappers';
import { FOOD_SERVICE_MAP_ANCHOR } from '../src/constants/zoo';
import { LiveMap } from '../test-support/mapHarness';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const tiger = MOCK_MAP_PLACES.find((place) => place.id === 'juan')!;
const noop = () => undefined;

const emptyRepository: MapRepository = {
  getPlaces: async () => [],
  getSections: async () => MOCK_MAP_SECTIONS,
  getZooPlaces: async () => [],
  getPathNodes: async () => [],
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
    getZooPlaces: async () => [],
    getPathNodes: async () => [],
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

const food = mapZooPlaceToModel({
  id: 17, name: 'Establecimientos de comida', place_type: 'comercial', map_x: 0.39, map_y: 0.4,
});
const facilities: ZooPlace[] = [
  { id: '15', name: 'Baños', placeType: 'servicios', mapX: 0.51, mapY: 0.73, isVisible: true },
  { id: '16', name: 'Boletaje', placeType: 'operativo', mapX: 0.31, mapY: 0.68, isVisible: true, description: 'Compra de boletos' },
];

function restaurantRepository(zooPlaces: ZooPlace[]): MapRepository {
  return {
    ...emptyRepository,
    getPlaces: async () => MOCK_MAP_PLACES.map((place) => (
      place.id === 'food-court' ? { ...place, mapX: 0.7, mapY: 0.83 } : place
    )),
    getZooPlaces: async () => zooPlaces,
  };
}

describe('MapScreen', () => {
  it('mobile-017 CA-12: prefiere el punto de comida de la API dentro del rectángulo canónico', async () => {
    const view = await render(<LiveMap repository={restaurantRepository([...facilities, food])} />);
    const marker = await view.findByRole('button', { name: 'Establecimientos de comida, Lugar' });
    expect(view.queryByTestId('map-marker-food-court')).toBeNull();
    expect(StyleSheet.flatten(marker.props.style)).toMatchObject({
      left: `${FOOD_SERVICE_MAP_ANCHOR.mapX * 100}%`,
      top: `${FOOD_SERVICE_MAP_ANCHOR.mapY * 100}%`,
    });
  });

  it('mobile-017 CA-12: corrige y muestra el respaldo si falta el punto de comida, aunque haya otros lugares', async () => {
    const view = await render(<LiveMap repository={restaurantRepository([...facilities, { ...food, isVisible: false }])} />);
    const marker = await view.findByRole('button', { name: 'Comida, Servicio' });
    expect(view.queryByTestId('map-marker-zoo-place-17')).toBeNull();
    expect(StyleSheet.flatten(marker.props.style)).toMatchObject({
      left: `${FOOD_SERVICE_MAP_ANCHOR.mapX * 100}%`,
      top: `${FOOD_SERVICE_MAP_ANCHOR.mapY * 100}%`,
    });
    await fireEvent.press(marker);
    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
    expect(view.getByText('Puesto de alimentos y bebidas.')).toBeTruthy();
  });

  it('mobile-017 CA-13: conserva el despliegue al cambiar de punto hasta tocar Ver menos', async () => {
    const view = await render(<LiveMap repository={restaurantRepository(facilities)} />);
    await view.findByRole('button', { name: 'Boletaje, Lugar' });
    await act(async () => view.getByTestId('map-viewport-gesture-area').props.onLayout({
      nativeEvent: { layout: { width: 320, height: 360, x: 0, y: 0 } },
    }));
    await fireEvent.press(view.getByRole('button', { name: 'Acercar mapa' }));
    const viewport = () => StyleSheet.flatten(view.getByTestId('map-viewport-content').props.style);
    const previousViewport = viewport();

    await fireEvent.press(view.getByRole('button', { name: 'Baños, Lugar' }));
    expect(view.getByText('Baños')).toBeTruthy();
    expect(view.queryByText('servicios')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
    expect(view.getByText('servicios')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Boletaje, Lugar' }));
    expect(view.queryByText('Baños')).toBeNull();
    expect(view.getByText('Boletaje')).toBeTruthy();
    expect(view.queryByText('servicios')).toBeNull();
    expect(view.getByText('Compra de boletos')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Boletaje, Lugar' }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(view.getByTestId('map-clear-selection'));
    expect(view.queryByText('Boletaje')).toBeNull();
    expect(view.queryByTestId('map-clear-selection')).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Boletaje, Lugar' }));
    expect(view.getByText('Compra de boletos')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Ver menos' }));
    expect(view.queryByText('Compra de boletos')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Baños, Lugar' }));
    expect(view.getByRole('button', { name: 'Ver detalles' })).toBeTruthy();
    expect(view.queryByText('servicios')).toBeNull();
    expect(viewport()).toEqual(previousViewport);
  });

  it('mobile-017 CA-13: cada punto cercano responde por separado y dibuja la ruta y el halo del destino', async () => {
    const nearby = [
      { ...facilities[0], mapX: 0.48, mapY: 0.60 },
      { ...facilities[1], mapX: 0.49, mapY: 0.60 },
    ];
    const view = await render(
      <LiveMap
        repository={restaurantRepository(nearby)}
        userPosition={{ svgX: 523, svgY: 828, lat: 20.0808, lon: -98.3614, accuracy: 5, searching: false }}
      />,
    );
    const bathroom = await view.findByRole('button', { name: 'Baños, Lugar' });
    const tickets = view.getByRole('button', { name: 'Boletaje, Lugar' });
    const widthPercent = (marker: typeof bathroom) => parseFloat(String(StyleSheet.flatten(marker.props.style).width));
    expect(widthPercent(bathroom) + widthPercent(tickets)).toBeCloseTo(2);

    for (const [name, mapX] of [['Baños', 0.48], ['Boletaje', 0.49]] as const) {
      await fireEvent.press(view.getByRole('button', { name: `${name}, Lugar` }));
      expect(view.getByText(name)).toBeTruthy();
      expect(view.getByTestId('destination-route-polyline')).toBeTruthy();
      expect(Number(view.getByTestId('destination-route-target-pulse').props.cx)).toBeCloseTo(mapX * 1600);
    }

    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
    await fireEvent.press(view.getByRole('button', { name: 'Fijar como destino' }));
    await fireEvent.press(view.getByTestId('map-clear-selection'));
    expect(view.getByText('Ruta a Boletaje')).toBeTruthy();
  });

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
    expect(view.getByLabelText(/Mapa canónico del zoológico/)).toBeTruthy();
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

  it('test-ca-03: abre la barra al tocar un marcador y deja consultar el detalle', async () => {
    const view = await render(<DetailHarness />);

    await fireEvent.press(view.getByTestId('map-marker-juan'));

    expect(view.getByText('Hábitat del Tigre')).toBeTruthy();
    expect(view.queryByText('Sección: Felinos')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
    expect(view.getByText('Sección: Felinos')).toBeTruthy();
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
    expect(view.getByTestId('zoo-map-svg')).toBeTruthy();

    await fireEvent.press(view.getByRole('button', { name: 'Cerrar' }));

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
    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
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
    await fireEvent.press(view.getByRole('button', { name: 'Ver detalles' }));
    expect(view.getByText('Recinto de Juan, el tigre de Bengala.')).toBeTruthy();
  });
});
