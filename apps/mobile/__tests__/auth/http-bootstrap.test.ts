import { accountSession } from '../../src/session/accountSession';
import { createSecureTokenStorage } from '../../src/services/tokenStorage';

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

const profile = {
  email: 'ana@ejemplo.com',
  first_name: 'Ana',
  nickname: 'Anita',
  avatar_code: 'jaguar',
};

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

describe('Arranque con la API de pruebas', () => {
  beforeEach(async () => {
    mockItems.clear();
    await accountSession.resetForTests();
  });

  it('test-ca-01-http-bootstrap-me: CA-01 entra si el perfil responde y el mock sigue sin URL', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/me')) {
        return jsonResponse(200, { data: profile });
      }
      return jsonResponse(404, { message: 'No encontrado.' });
    });
    accountSession.configureForTests({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await createSecureTokenStorage().write({ accessToken: 'access-http', refreshToken: 'refresh-http' });

    await accountSession.bootstrap();
    expect(accountSession.getStatus()).toBe('authenticated');

    await accountSession.resetForTests();
    const mockLogin = await accountSession.login('correo@ejemplo.com', 'secreta');
    expect(mockLogin.ok).toBe(true);
    expect(accountSession.getStatus()).toBe('authenticated');
  });

  it('con la sesión ya autenticada bootstrap no vuelve a llamar getProfile', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/me')) {
        return jsonResponse(200, { data: profile });
      }
      return jsonResponse(404, { message: 'No encontrado.' });
    });
    accountSession.configureForTests({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await createSecureTokenStorage().write({ accessToken: 'access-http', refreshToken: 'refresh-http' });

    await accountSession.bootstrap();
    expect(accountSession.getStatus()).toBe('authenticated');
    const callsAfterEntry = fetchImpl.mock.calls.length;
    expect(callsAfterEntry).toBeGreaterThan(0);

    await accountSession.bootstrap();
    expect(fetchImpl).toHaveBeenCalledTimes(callsAfterEntry);
    expect(accountSession.getStatus()).toBe('authenticated');
  });

  it('test-ca-05-http-bootstrap-refresh-failure: CA-05 borra el par si la sesión no se renueva', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(401, { message: 'La sesión ya no es válida. Vuelve a entrar.' }));
    accountSession.configureForTests({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await createSecureTokenStorage().write({ accessToken: 'access-http', refreshToken: 'refresh-http' });

    await accountSession.bootstrap();
    expect(accountSession.getStatus()).toBe('guest');
    expect(await createSecureTokenStorage().read()).toBeNull();
  });
});