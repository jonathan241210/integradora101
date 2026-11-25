import React from 'react';
import { render, fireEvent, within } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import type { PathNode, ZooPlace } from '../src/models';
import { MapScreen } from '../src/screens/MapScreen';
import { MOCK_MAP_PLACES, MOCK_MAP_SECTIONS } from '../src/mocks/zoo';
import { UserPosition } from '../src/viewmodels/useLocationViewModel';

const noop = () => undefined;

const position: UserPosition = {
  svgX: 500,
  svgY: 1280,
  lat: 20.08,
  lon: -98.722,
  accuracy: 5,
  searching: false,
  heading: 0,
};

function renderMap(overrides: Partial<React.ComponentProps<typeof MapScreen>> = {}) {
  return render(
    <MapScreen
      sections={MOCK_MAP_SECTIONS}
      filteredPlaces={[]}
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
      {...overrides}
    />,
  );
}

describe('Mobile 015 â€” AR location-based overlay (CA-01, CA-02, CA-07, CA-08)', () => {
  it('mobile-016 CA-05: ofrece AR por ubicación y regreso al mapa sin mostrar la PoC ni la etiqueta AR', async () => {
    const view = await renderMap({ filteredPlaces: MOCK_MAP_PLACES });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(view.getByTestId('location-ar-scene')).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Probar AR nativa PoC' })).toBeNull();
    expect(view.queryByText('AR nativa PoC')).toBeNull();
    expect(view.queryByText('AR', { exact: true })).toBeNull();

    await fireEvent.press(view.getByRole('button', { name: 'Volver al mapa 2D' }));
    expect(view.queryByTestId('location-ar-scene')).toBeNull();
    expect(view.getByRole('button', { name: 'Iniciar AR' })).toBeTruthy();
  });

  it('test-ca-01: abre AR desde MapScreen y no muestra modo escena 3D sin cÃ¡mara', async () => {
    const view = await renderMap({ filteredPlaces: MOCK_MAP_PLACES });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(view.getByTestId('ar-tour-overlay')).toBeTruthy();
    expect(view.queryByTestId('toggle-ar-visual-mode')).toBeNull();
    expect(view.queryByTestId('ar-virtual-3d-floor')).toBeNull();
  });

  it('test-ca-02: el modo AR no renderiza la lÃ­nea/flechas SVG antiguas del overlay', async () => {
    const view = await renderMap({ filteredPlaces: MOCK_MAP_PLACES });

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
    const view = await renderMap({ filteredPlaces: [nearbyEnclosure] });

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    expect(view.getByTestId('ar-point-enclosure-nearby-enclosure')).toBeTruthy();
  });

  it('mobile-015 CA-04b: abre la ficha del recinto cercano aunque quede detrás de la cámara', async () => {
    const enclosure = {
      ...MOCK_MAP_PLACES.find((place) => place.kind === 'animal')!,
      id: 'behind-camera',
      name: 'Recinto detrás de ti',
      gpsLat: position.lat - 0.0004,
      gpsLon: position.lon,
    };
    const view = await renderMap({ filteredPlaces: [enclosure] });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(view.queryByTestId('ar-point-enclosure-behind-camera')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: /^Recinto detrás de ti,/ }));
    await fireEvent.press(view.getByRole('button', { name: /ver ficha/i }));
    expect(view.getByTestId('enclosure-detail-sheet')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Cerrar ficha técnica del recinto' }));
    await fireEvent.press(view.getByRole('button', { name: 'Cerrar ficha interactiva del recinto' }));
    expect(view.queryByTestId('ar-animal-proximity-card')).toBeNull();
  });

  it('mobile-015 CA-03, CA-04b, CA-04c: selecciona servicios visibles y conserva el estado visitado al cerrar el aviso', async () => {
    const service: ZooPlace = {
      id: 'cafe', name: 'Cafetería', placeType: 'comercial', isVisible: true,
      gpsLat: position.lat + 0.0001, gpsLon: position.lon, description: 'Bebidas y alimentos',
    };
    const view = await renderMap({ zooPlaces: [
      { ...service, id: 'hidden', name: 'Área cerrada', isVisible: false },
      { ...service, id: 'no-latitude', name: 'Lugar sin latitud', gpsLat: null },
      { ...service, id: 'no-longitude', name: 'Lugar sin longitud', gpsLon: null },
      { ...service, id: 'far', name: 'Estacionamiento', gpsLat: position.lat + 0.004 },
      { ...service, id: 'rest', name: 'Área de descanso', gpsLat: position.lat + 0.0006, description: null },
      service,
    ] });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(view.getByTestId('ar-point-zoo-place-cafe')).toBeTruthy();
    expect(within(view.getByTestId('ar-arrival-banner')).getByText('comercial • Bebidas y alimentos')).toBeTruthy();
    const cafeteria = view.getByRole('button', { name: /^Cafetería, .*visitado$/ });
    await fireEvent.press(cafeteria);
    expect(within(view.getByTestId('ar-selected-zoo-place-card')).getByText('Visitado')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Cerrar aviso de llegada' }));
    expect(view.queryByTestId('ar-arrival-banner')).toBeNull();
    await fireEvent.press(cafeteria);
    expect(view.queryByTestId('ar-selected-zoo-place-card')).toBeNull();
    await fireEvent.press(view.getByRole('button', { name: /^Área de descanso,/ }));
    expect(within(view.getByTestId('ar-selected-zoo-place-card')).getByText('Lugar cercano')).toBeTruthy();
    expect(view.queryByRole('button', { name: /^(Área cerrada|Lugar sin latitud|Lugar sin longitud|Estacionamiento),/ })).toBeNull();
  });

  it('mobile-015 CA-04c: avisa al llegar a un recinto y mantiene su estado visitado al descartar el aviso', async () => {
    const enclosure = {
      ...MOCK_MAP_PLACES[0], gpsLat: position.lat, gpsLon: position.lon,
    };
    const view = await renderMap({ filteredPlaces: [
      enclosure,
      { ...enclosure, id: 'no-latitude', gpsLat: undefined },
      { ...enclosure, id: 'no-longitude', gpsLon: undefined },
    ] });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    expect(within(view.getByTestId('ar-arrival-banner')).getByText('Recinto cercano')).toBeTruthy();
    await fireEvent.press(view.getByRole('button', { name: 'Cerrar aviso de llegada' }));
    expect(view.queryByTestId('ar-arrival-banner')).toBeNull();
    expect(view.getByRole('button', { name: `${enclosure.name}, 0 m, visitado` })).toBeTruthy();
  });

  it.each([
    ['inicio', 'Inicio de sendero', 0.0001, 0, 'Al frente'],
    ['fin', 'Fin de sendero', -0.0001, 0, 'Detrás de ti'],
    ['paso', 'Punto de paso', 0, 0.0001, 'Gira a la derecha'],
    ['interseccion', 'Intersección', 0, -0.0001, 'Gira a la izquierda'],
    ['otro', 'Punto de sendero', 0, -0.0001, ''],
  ])('mobile-015 CA-03, CA-05: muestra el nodo %s más cercano como tarjeta contextual', async (nodeType, label, latOffset, lonOffset, instruction) => {
    const node: PathNode = {
      id: 'nearby', name: instruction ? '  Cruce cercano  ' : ' ', nodeType,
      gpsLat: position.lat + latOffset, gpsLon: position.lon + lonOffset,
    };
    const view = await renderMap({
      userPosition: instruction ? position : { ...position, heading: undefined },
      pathNodes: [
        { ...node, id: 'no-latitude', gpsLat: null },
        { ...node, id: 'no-longitude', gpsLon: null },
        { ...node, id: 'out-of-range', gpsLat: position.lat + 0.004 },
        { ...node, id: 'second', name: 'Segundo cruce', gpsLat: position.lat + 0.0002, gpsLon: position.lon },
        node,
        { ...node, id: 'third', gpsLat: position.lat + 0.0002, gpsLon: position.lon },
      ],
    });

    await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
    const card = within(view.getByTestId('ar-nearby-path-node-card'));
    expect(card.getByText(label)).toBeTruthy();
    expect(card.getByText(instruction ? 'Cruce cercano' : `Nodo ${nodeType}`, { exact: false })).toBeTruthy();
    if (instruction) expect(card.getByText(instruction)).toBeTruthy();
    else expect(view.getByTestId('ar-calibration-hint')).toHaveTextContent(/Brújula no disponible/);
    expect(view.queryByText('Segundo cruce')).toBeNull();
    expect(view.queryByTestId(`ar-point-${node.id}`)).toBeNull();
  });

  it('mobile-015 CA-07: con la cámara denegada y sin GPS ofrece volver y conserva la búsqueda 2D', async () => {
    const request = jest.fn();
    const search = jest.fn();
    const camera = jest.mocked(useCameraPermissions);
    const denied = { granted: false, canAskAgain: false } as NonNullable<ReturnType<typeof useCameraPermissions>[0]>;
    await camera.withImplementation(() => [denied, request, jest.fn()], async () => {
      const view = await renderMap({ userPosition: null, onSearchPress: search });
      await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
      expect(view.getByTestId('ar-camera-permission-fallback')).toHaveTextContent(/Se necesita permiso de cámara/);
      expect(view.getByTestId('ar-calibration-hint')).toHaveTextContent(/Activa la ubicación/);
      expect(view.queryByTestId('ar-camera-feed-layer')).toBeNull();
      expect(request).not.toHaveBeenCalled();
      await fireEvent.press(view.getByRole('button', { name: 'Volver al mapa 2D' }));
      await fireEvent.press(view.getByRole('button', { name: 'Buscar animales' }));
      expect(search).toHaveBeenCalledTimes(1);
    });
  });

  it('mobile-015 CA-04, CA-07: informa la baja precisión y permite salir si falla la solicitud de cámara', async () => {
    const request = jest.fn().mockRejectedValue(new Error('Cámara no disponible'));
    await jest.mocked(useCameraPermissions).withImplementation(() => [null, request, jest.fn()], async () => {
      const view = await renderMap({ userPosition: { ...position, accuracy: 60 } });
      await fireEvent.press(view.getByRole('button', { name: 'Iniciar AR' }));
      expect(request).toHaveBeenCalledTimes(1);
      expect(view.getByTestId('ar-calibration-hint')).toHaveTextContent(/Precisión baja/);
      await fireEvent.press(view.getByRole('button', { name: 'Volver al mapa 2D' }));
      expect(view.queryByTestId('ar-tour-overlay')).toBeNull();
    });
  });

  it('test-ca-07, test-ca-08: cierra el AR y vuelve al mapa 2D sin bloquear la navegaciÃ³n', async () => {
    const view = await renderMap({ filteredPlaces: MOCK_MAP_PLACES });

    await fireEvent.press(view.getByTestId('start-ar-tour-button'));
    await fireEvent.press(view.getByRole('button', { name: 'Volver al mapa 2D' }));
    expect(view.queryByTestId('ar-tour-overlay')).toBeNull();
    expect(view.getByRole('button', { name: 'Iniciar AR' })).toBeTruthy();
  });
});
