declare const __dirname: string;

import Constants from 'expo-constants';
import { DEV_API_URL, INSECURE_API_URL_MESSAGE, isMockDataEnabled, MISSING_API_URL_MESSAGE, resolveApiBaseUrl } from '../../src/config/runtime';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { allowCleartext: false } } },
}));

const fs = jest.requireActual<{
  readdirSync: (directory: string) => string[];
  readFileSync: (file: string, encoding: string) => string;
}>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const root = path.join(__dirname, '..', '..');

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name.includes('.')) return name.endsWith('.ts') || name.endsWith('.tsx') ? [full] : [];
    return sourceFiles(full);
  });
}

describe('mobile-018 build de producción', () => {
  afterEach(() => jest.restoreAllMocks());

  it('CA-01 eas.json tiene el perfil production sin cleartext y con API https', () => {
    const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
    const production = eas.build.production;
    expect(production).toBeDefined();
    expect(production.env.EXPO_USE_CLEARTEXT).toBeUndefined();
    expect(production.env.EXPO_PUBLIC_API_URL).toMatch(/^https:\/\//);
  });

  it('CA-02 sin EXPO_PUBLIC_API_URL usa la URL local en desarrollo y nunca 10.0.2.2', () => {
    expect(resolveApiBaseUrl({ configured: '', isDev: true })).toBe(DEV_API_URL);
    expect(resolveApiBaseUrl({ configured: undefined, env: { NODE_ENV: 'test' } })).toBe(DEV_API_URL);
    expect(DEV_API_URL).not.toContain('10.0.2.2');
    expect(resolveApiBaseUrl({ configured: ' https://api.zoo.invalid/api/v1 ', isDev: false }))
      .toBe('https://api.zoo.invalid/api/v1');
  });

  it('CA-02 sin EXPO_PUBLIC_API_URL en producción falla con un mensaje claro en español', () => {
    expect(() => resolveApiBaseUrl({ configured: '  ', isDev: false, env: {} })).toThrow(MISSING_API_URL_MESSAGE);
    expect(MISSING_API_URL_MESSAGE).toContain('EXPO_PUBLIC_API_URL');
    expect(MISSING_API_URL_MESSAGE).toMatch(/Falta/);
  });

  it('CA-02 en producción rechaza una URL de la API que no use HTTPS', () => {
    expect(() => resolveApiBaseUrl({ configured: 'http://api.zoo.test/api/v1', isDev: false, env: {} })).toThrow(INSECURE_API_URL_MESSAGE);
    expect(resolveApiBaseUrl({ configured: 'https://api.zoo.test/api/v1', isDev: false, env: {} })).toBe('https://api.zoo.test/api/v1');
    expect(resolveApiBaseUrl({ configured: 'http://192.168.0.10:8000/api/v1', isDev: true, env: {} })).toBe('http://192.168.0.10:8000/api/v1');
  });

  it('CA-02 preview acepta HTTP explícito incluso con el bundle compilado sin __DEV__', () => {
    jest.replaceProperty(Constants.expoConfig!.extra!, 'allowCleartext', true);
    const apiUrl = 'http://192.168.0.10:8000/api/v1';

    expect(resolveApiBaseUrl({ isDev: false, env: { EXPO_PUBLIC_API_URL: apiUrl } })).toBe(apiUrl);
    expect(() => resolveApiBaseUrl({ configured: 'ftp://zoo.test', isDev: false })).toThrow(INSECURE_API_URL_MESSAGE);
  });

  it('CA-02 ningún archivo de src conserva el respaldo 10.0.2.2 de la API', () => {
    const offenders = sourceFiles(path.join(root, 'src')).filter((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return text.includes("?? 'http://10.0.2.2");
    });
    expect(offenders).toEqual([]);
  });

  it('CA-08 los mocks solo se habilitan con EXPO_PUBLIC_USE_MOCKS=true o en pruebas', () => {
    expect(isMockDataEnabled({ EXPO_PUBLIC_USE_MOCKS: 'true', NODE_ENV: 'production' })).toBe(true);
    expect(isMockDataEnabled({ NODE_ENV: 'test' })).toBe(true);
    expect(isMockDataEnabled({ NODE_ENV: 'test', EXPO_PUBLIC_USE_API: 'true' })).toBe(false);
    expect(isMockDataEnabled({ NODE_ENV: 'production' })).toBe(false);
    expect(isMockDataEnabled({})).toBe(false);
  });
});
