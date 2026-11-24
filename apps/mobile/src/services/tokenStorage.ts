export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenStorage {
  read(): Promise<AuthTokens | null>;
  write(tokens: AuthTokens): Promise<void>;
  clear(): Promise<void>;
  clearIfCurrent(accessToken: string | null): Promise<boolean>;
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
    async clearIfCurrent(accessToken) {
      if ((tokens?.accessToken ?? null) !== accessToken) return false;
      tokens = null;
      return true;
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

// Todas las instancias usan las mismas claves. El par se lee y modifica en orden.
let secureOperations = Promise.resolve();

function withSecureStore<T>(operation: () => Promise<T>): Promise<T> {
  const result = secureOperations.then(operation);
  secureOperations = result.then(() => undefined, () => undefined);
  return result;
}

export function createSecureTokenStorage(store?: SecureStoreModule): TokenStorage {
  const secureStore = store ?? (require('expo-secure-store') as SecureStoreModule);
  const clearPair = async () => {
    await secureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await secureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  };

  return {
    read() {
      return withSecureStore(async () => {
        const accessToken = await secureStore.getItemAsync(ACCESS_TOKEN_KEY);
        const refreshToken = await secureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (!accessToken || !refreshToken) return null;
        return { accessToken, refreshToken };
      });
    },
    write(next) {
      return withSecureStore(async () => {
        await secureStore.setItemAsync(ACCESS_TOKEN_KEY, next.accessToken);
        await secureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken);
      });
    },
    clear() {
      return withSecureStore(clearPair);
    },
    clearIfCurrent(accessToken) {
      return withSecureStore(async () => {
        if (await secureStore.getItemAsync(ACCESS_TOKEN_KEY) !== accessToken) return false;
        await clearPair();
        return true;
      });
    },
  };
}

export const tokenStorage = createMemoryTokenStorage();
