/**
 * Mock de expo-location para tests Jest.
 * Simula permisos y suscripción GPS sin dependencias nativas.
 */

type WatchCallback = (location: {
  coords: { latitude: number; longitude: number; accuracy: number };
}) => void;

let _callback: WatchCallback | null = null;
let _permissionStatus: 'granted' | 'denied' = 'denied';
let _coords = { latitude: 0, longitude: 0, accuracy: 50 };

/** Simula permiso concedido con una posición y precisión dadas. */
export function mockGranted(accuracy: number, lat: number, lon: number) {
  _permissionStatus = 'granted';
  _coords = { latitude: lat, longitude: lon, accuracy };
}

/** Simula permiso denegado. */
export function mockDenied() {
  _permissionStatus = 'denied';
  _callback = null;
}

/** Simula permiso concedido pero señal débil (accuracy = 50m). */
export function mockSearching() {
  mockGranted(50, 20.0800, -98.7220);
}

/** Emite una nueva posición al callback de watchPosition (si existe). */
export function emitPosition(lat: number, lon: number, accuracy: number) {
  _coords = { latitude: lat, longitude: lon, accuracy };
  if (_callback) {
    _callback({ coords: _coords });
  }
}

/** Resetea el estado del mock. */
export function resetLocationMock() {
  _callback = null;
  _permissionStatus = 'denied';
  _coords = { latitude: 0, longitude: 0, accuracy: 50 };
}

// Mock del módulo expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: _permissionStatus,
  })),
  watchPositionAsync: jest.fn(async (options: unknown, callback: WatchCallback) => {
    _callback = callback;
    // Emitir posición inicial
    callback({ coords: _coords });
    return { remove: jest.fn(() => { _callback = null; }) };
  }),
  Accuracy: {
    BestForNavigation: 6,
    Highest: 6,
    High: 5,
    Balanced: 4,
    Low: 3,
    Lowest: 1,
  },
}));
