/**
 * Mock de expo-location para tests Jest.
 * Simula permisos y suscripción GPS sin dependencias nativas.
 */

type WatchCallback = (location: {
  coords: { latitude: number; longitude: number; accuracy: number };
}) => void;

type HeadingCallback = (heading: {
  trueHeading: number;
  magHeading: number;
  accuracy: number;
}) => void;

let mockCallback: WatchCallback | null = null;
let mockHeadingCallback: HeadingCallback | null = null;
let mockPermissionStatus: 'granted' | 'denied' = 'denied';
let mockCoords = { latitude: 0, longitude: 0, accuracy: 50 };
let mockHeading = { trueHeading: 90, magHeading: 90, accuracy: 3 };

/** Simula permiso concedido con una posición y precisión dadas. */
export function mockGranted(accuracy: number, lat: number, lon: number) {
  mockPermissionStatus = 'granted';
  mockCoords = { latitude: lat, longitude: lon, accuracy };
}

/** Simula permiso denegado. */
export function mockDenied() {
  mockPermissionStatus = 'denied';
  mockCallback = null;
  mockHeadingCallback = null;
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

/** Emite una nueva orientación de brújula/giroscopio. */
export function emitHeading(trueHeading: number, magHeading = trueHeading) {
  mockHeading = { trueHeading, magHeading, accuracy: 3 };
  if (mockHeadingCallback) {
    mockHeadingCallback(mockHeading);
  }
}

/** Resetea el estado del mock. */
export function resetLocationMock() {
  mockCallback = null;
  mockHeadingCallback = null;
  mockPermissionStatus = 'denied';
  mockCoords = { latitude: 0, longitude: 0, accuracy: 50 };
  mockHeading = { trueHeading: 90, magHeading: 90, accuracy: 3 };
}

// Mock del módulo expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: mockPermissionStatus,
    granted: mockPermissionStatus === 'granted',
  })),
  watchPositionAsync: jest.fn(async (options: unknown, callback: WatchCallback) => {
    mockCallback = callback;
    // Emitir posición inicial
    callback({ coords: mockCoords });
    return { remove: jest.fn(() => { mockCallback = null; }) };
  }),
  watchHeadingAsync: jest.fn(async (callback: HeadingCallback) => {
    mockHeadingCallback = callback;
    callback(mockHeading);
    return { remove: jest.fn(() => { mockHeadingCallback = null; }) };
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
