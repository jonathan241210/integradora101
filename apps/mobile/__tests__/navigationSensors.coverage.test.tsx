import { act, renderHook } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import * as Location from 'expo-location';
import { useLocationViewModel } from '../src/viewmodels/useLocationViewModel';
import { useArTourViewModel } from '../src/viewmodels/useArTourViewModel';
import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import { ZOO_ENTRANCE_SVG } from '../src/constants/zoo';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(), watchPositionAsync: jest.fn(),
  watchHeadingAsync: jest.fn(), Accuracy: { BestForNavigation: 6 },
}));
const location = jest.mocked(Location);
let position: Location.LocationCallback;
let heading: Location.LocationHeadingCallback;
const removePosition = jest.fn();
const removeHeading = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted', granted: true } as never);
  location.watchPositionAsync.mockImplementation(async (_options, callback) => {
    position = callback; return { remove: removePosition };
  });
  location.watchHeadingAsync.mockImplementation(async callback => {
    heading = callback; return { remove: removeHeading };
  });
});
afterEach(() => { jest.restoreAllMocks(); });

describe('mobile-011 CA-05: GPS y brújula sin sensores físicos', () => {
  it('normaliza orientación, ignora datos inválidos y degrada posiciones sin precisión', async () => {
    const { result, unmount } = await renderHook(() => useLocationViewModel());
    expect(result.current.permissionGranted).toBe(true);
    await act(async () => {
      heading({ trueHeading: -1, magHeading: 450 } as never);
      heading({ trueHeading: NaN, magHeading: NaN } as never);
      heading({} as never);
    });
    expect(result.current.heading).toBe(90);
    expect(result.current.userPosition).toBeNull();
    await act(async () => { position({ coords: { latitude: 20.08, longitude: -98.72, accuracy: null } } as never); });
    expect(result.current.userPosition).toMatchObject({ ...ZOO_ENTRANCE_SVG, searching: true, accuracy: 999, heading: 90 });
    await act(async () => {
      position({ coords: { latitude: 20.08, longitude: -98.72, accuracy: 5 } } as never);
      heading({ trueHeading: 180 } as never);
    });
    const previous = result.current.userPosition;
    expect(previous).toMatchObject({ searching: false, heading: 180 });
    await act(async () => { heading({ trueHeading: 180 } as never); });
    expect(result.current.userPosition).toBe(previous);
    await unmount();
    expect(removePosition).toHaveBeenCalledTimes(1);
    expect(removeHeading).toHaveBeenCalledTimes(1);
  });
  it.each([undefined, { status: 'denied', granted: false }])('tolera permiso ausente o denegado: %j', async response => {
    location.requestForegroundPermissionsAsync.mockResolvedValue(response as never);
    const { result } = await renderHook(() => useLocationViewModel());
    expect(result.current.permissionGranted).toBe(false);
    expect(location.watchPositionAsync).not.toHaveBeenCalled();
  });
  it('tolera errores al solicitar permiso y permite reintentar usando granted', async () => {
    location.requestForegroundPermissionsAsync.mockRejectedValueOnce(new Error('unavailable'));
    const { result } = await renderHook(() => useLocationViewModel());
    expect(result.current.permissionGranted).toBe(false);
    location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
    location.watchHeadingAsync.mockRejectedValueOnce(new Error('sin brújula'));
    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permissionGranted).toBe(true);
    await act(async () => { position({ coords: { latitude: 0, longitude: 0, accuracy: 5 } } as never); });
    expect(result.current.userPosition?.searching).toBe(false);
  });
  it('notifica como permiso no disponible si falla la suscripción GPS', async () => {
    location.watchPositionAsync.mockRejectedValueOnce(new Error('GPS unavailable'));
    const { result } = await renderHook(() => useLocationViewModel());
    expect(result.current.permissionGranted).toBe(false);
    expect(location.watchHeadingAsync).not.toHaveBeenCalled();
  });
});

describe('mobile-011 CA-05: recorrido, ausencia de destinos y llegada', () => {
  it('mantiene controles seguros sin paradas y permite alternar modos y cerrar', async () => {
    const { result } = await renderHook(() => useArTourViewModel({ places: [] }));
    await act(async () => {
      result.current.startTour(); result.current.alignFront();
      result.current.nextStop(); result.current.prevStop();
      result.current.selectForkStop('inexistente'); result.current.dismissProximityCard();
    });
    expect(result.current).toMatchObject({ isTourOpen: true, currentStop: null, walkRoute: null, guidance: null, forkBranches: [], showProximityCard: false, isArrived: false });
    await act(async () => { result.current.toggleVisualMode(); });
    expect(result.current.visualMode).toBe('scene-3d');
    await act(async () => { result.current.toggleVisualMode(); result.current.closeTour(); });
    expect(result.current).toMatchObject({ visualMode: 'camera-ar', isTourOpen: false });
  });
  it('selecciona destinos existentes, avanza y vuelve sin duplicar visitas', async () => {
    const select = jest.fn();
    const active = MOCK_MAP_PLACES.find(p => p.id === 'juan')!;
    const { result } = await renderHook(() => useArTourViewModel({ places: MOCK_MAP_PLACES, activeDestinationPlace: active, onSelectDestination: select }));
    await act(async () => { result.current.startTour(); });
    expect(result.current.currentStop?.id).toBe(active.id);
    expect(select).not.toHaveBeenCalled();
    await act(async () => { result.current.nextStop(); });
    expect(select).toHaveBeenCalledWith(result.current.currentStop?.id);
    await act(async () => { result.current.prevStop(); });
    expect(result.current.currentStop?.id).toBe(active.id);
    await act(async () => { result.current.nextStop(); });
    expect(result.current.visitedStopIds).toEqual([active.id]);
    await act(async () => { result.current.selectForkStop(active.id); result.current.alignFront(); });
    expect(result.current.currentStop?.id).toBe(active.id);
    await act(async () => { result.current.selectForkStop('missing'); });
    expect(result.current.currentStop?.id).toBe(active.id);
  });
  it('elige la primera parada si el destino ya no está en el catálogo y admite recorrido sin callback', async () => {
    const { result } = await renderHook(() => useArTourViewModel({ places: MOCK_MAP_PLACES, activeDestinationPlace: { ...MOCK_MAP_PLACES[0], id: 'removed' } }));
    await act(async () => { result.current.startTour(); });
    expect(result.current.currentStopIndex).toBe(0);
    await act(async () => { result.current.nextStop(); result.current.rotateLeft(); });
    await act(async () => { result.current.prevStop(); result.current.rotateRight(); });
    expect(result.current.currentStopIndex).toBe(0);
    await act(async () => { result.current.selectForkStop(result.current.tourStops[1].id); });
    expect(result.current.currentStopIndex).toBe(1);
    for (let i = 0; i < 4; i++) await act(async () => { result.current.stepAnimation(); });
    expect(result.current.guidance).not.toBeNull();
  });
  it('muestra llegada por GPS, permite descartarla y tolera vibración no disponible', async () => {
    const stop = { ...MOCK_MAP_PLACES[0], id: 'arrival', gpsLat: 20.08, gpsLon: -98.72 };
    const vibrate = jest.spyOn(Vibration, 'vibrate').mockImplementation(() => { throw new Error('sin motor'); });
    const { result, rerender } = await renderHook(({ degrees }: { degrees: number }) => useArTourViewModel({
      places: [stop], userPosition: { svgX: 0, svgY: 0, lat: 20.08, lon: -98.72, accuracy: 5, searching: false, heading: degrees },
    }), { initialProps: { degrees: 90 } });
    expect(result.current).toMatchObject({ isArrived: true, showProximityCard: true });
    expect(vibrate).toHaveBeenCalledTimes(1);
    await act(async () => { result.current.alignFront(); result.current.rotateLeft(); });
    expect(result.current.headingDegrees).toBeGreaterThanOrEqual(0);
    await rerender({ degrees: 180 });
    expect(vibrate).toHaveBeenCalledTimes(1);
    await act(async () => { result.current.dismissProximityCard(); });
    expect(result.current.showProximityCard).toBe(false);
  });
});
