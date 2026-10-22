import { createSecureTokenStorage } from '../../src/services/tokenStorage';

declare const __dirname: string;

const fs = jest.requireActual<{ readFileSync: (path: string, encoding: string) => string }>('fs');
const path = jest.requireActual<{ join: (...parts: string[]) => string }>('path');

const mockItems = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(mockItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockItems.delete(key);
    return Promise.resolve();
  },
}));

describe('Almacenamiento seguro del visitante', () => {
  beforeEach(() => {
    mockItems.clear();
  });

  it('test-ca-05-secure-store-adapter: guarda y borra el par sin AsyncStorage', async () => {
    const source = fs.readFileSync(path.join(__dirname, '../../src/services/tokenStorage.ts'), 'utf8');
    expect(source).not.toMatch(/async-storage|AsyncStorage/);
    expect(source).toContain('expo-secure-store');

    const storage = createSecureTokenStorage();
    await storage.write({ accessToken: 'access-1', refreshToken: 'refresh-1' });
    expect(mockItems.get('arca.visitor.access_token')).toBe('access-1');
    expect(mockItems.get('arca.visitor.refresh_token')).toBe('refresh-1');
    expect(await storage.read()).toEqual({ accessToken: 'access-1', refreshToken: 'refresh-1' });

    await storage.clear();
    expect(mockItems.size).toBe(0);
    expect(await storage.read()).toBeNull();
  });
});
