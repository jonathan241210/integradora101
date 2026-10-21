export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStorage {
  read(): Promise<AuthTokens | null>;
  write(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryTokenStorage(): TokenStorage {
  let tokens: AuthTokens | null = null;

  return {
    async read() {
      return tokens ? { ...tokens } : null;
    },
    async write(next) {
      tokens = { ...next };
    },
    async clear() {
      tokens = null;
    },
  };
}

const ACCESS_TOKEN_KEY = 'arca.visitor.access_token';
const REFRESH_TOKEN_KEY = 'arca.visitor.refresh_token';

type SecureStoreModule = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export function createSecureTokenStorage(store?: SecureStoreModule): TokenStorage {
  const secureStore = store ?? (require('expo-secure-store') as SecureStoreModule);

  return {
    async read() {
      const accessToken = await secureStore.getItemAsync(ACCESS_TOKEN_KEY);
      const refreshToken = await secureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (!accessToken || !refreshToken) return null;
      return { accessToken, refreshToken };
    },
    async write(next) {
      await secureStore.setItemAsync(ACCESS_TOKEN_KEY, next.accessToken);
      await secureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken);
    },
    async clear() {
      await secureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await secureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    },
  };
}

export const tokenStorage = createMemoryTokenStorage();
