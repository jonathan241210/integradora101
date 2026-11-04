/**
 * Mock de expo-location para tests Jest.
 * Simula permisos y suscripción GPS sin dependencias nativas.
 */

type WatchCallback = (location: {
  coords: { latitude: number; longitude: number; accuracy: number };
}) => void;

let mockCallback: WatchCallback | null = null;
let mockPermissionStatus: 'granted' | 'denied' = 'denied';
let mockCoords = { latitude: 0, longitude: 0, accuracy: 50 };

/** Simula permiso concedido con una posición y precisión dadas. */
export function mockGranted(accuracy: number, lat: number, lon: number) {
  mockPermissionStatus = 'granted';
  mockCoords = { latitude: lat, longitude: lon, accuracy };
}

/** Simula permiso denegado. */
export function mockDenied() {
  mockPermissionStatus = 'denied';
  mockCallback = null;
}

/** Simula permiso concedido pero señal débil (accuracy = 50m). */
export function mockSearching() {
  mockGranted(50, 20.0800, -98.7220);
}

/** Emite una nueva posición al callback de watchPosition (si existe). */
export function emitPosition(lat: number, lon: number, accuracy: number) {
  mockCoords = { latitude: lat, longitude: lon, accuracy };
  if (mockCallback) {
    mockCallback({ coords: mockCoords });
  }
}

/** Resetea el estado del mock. */
export function resetLocationMock() {
  mockCallback = null;
  mockPermissionStatus = 'denied';
  mockCoords = { latitude: 0, longitude: 0, accuracy: 50 };
}

// Mock del módulo expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: mockPermissionStatus,
  })),
  watchPositionAsync: jest.fn(async (options: unknown, callback: WatchCallback) => {
    mockCallback = callback;
    // Emitir posición inicial
    callback({ coords: mockCoords });
    return { remove: jest.fn(() => { mockCallback = null; }) };
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
