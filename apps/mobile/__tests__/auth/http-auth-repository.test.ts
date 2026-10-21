import { createHttpAuthRepository } from '../../src/repositories/httpAuthRepository';
import { createMemoryTokenStorage } from '../../src/services/tokenStorage';

const profile = {
  email: 'ana@ejemplo.com',
  first_name: 'Ana',
  nickname: 'Anita',
  avatar_code: 'jaguar',
};

function jsonResponse(status: number, body?: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

describe('Repositorio HTTP de la cuenta', () => {
  it('test-ca-04-http-login-stores-tokens: CA-04 envía el dispositivo y traduce la red', async () => {
    const storage = createMemoryTokenStorage();
    let loginBody: Record<string, unknown> | null = null;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith('/auth/login')) {
        loginBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return jsonResponse(200, {
          data: {
            token_type: 'Bearer',
            expires_in: 900,
            access_token: 'access-http',
            refresh_token: 'refresh-http',
            visitor: profile,
          },
        });
      }
      return jsonResponse(404, { message: 'No encontrado.' });
    });
    const repository = createHttpAuthRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await repository.login('ana@ejemplo.com', 'secreta12');
    expect(result.ok).toBe(true);
    expect(loginBody).toMatchObject({ device_name: 'arca-mobile', email: 'ana@ejemplo.com' });
    expect(await storage.read()).toEqual({ accessToken: 'access-http', refreshToken: 'refresh-http' });

    const offline = createHttpAuthRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage: createMemoryTokenStorage(),
      fetchImpl: jest.fn(async () => {
        throw new Error('network down');
      }) as unknown as typeof fetch,
    });
    const failed = await offline.login('ana@ejemplo.com', 'secreta12');
    expect(failed).toMatchObject({ ok: false, status: 0, message: 'Sin conexión' });
  });

  it('test-ca-08-http-profile-and-notice: CA-08 traduce perfil y aviso', async () => {
    const storage = createMemoryTokenStorage();
    await storage.write({ accessToken: 'access-http', refreshToken: 'refresh-http' });
    let patchBody: Record<string, unknown> | null = null;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/legal/privacy-notice')) {
        return jsonResponse(200, { data: { version: '2026-10', content: 'Aviso de prueba.' } });
      }
      if (init?.method === 'PATCH') {
        patchBody = JSON.parse(String(init.body)) as Record<string, unknown>;
        return jsonResponse(200, { data: { ...profile, nickname: 'Nita', avatar_code: 'wolf' } });
      }
      return jsonResponse(200, { data: profile });
    });
    const repository = createHttpAuthRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(await repository.getPrivacyNotice()).toEqual({ version: '2026-10', content: 'Aviso de prueba.' });
    expect(await repository.getProfile()).toEqual({
      email: 'ana@ejemplo.com',
      firstName: 'Ana',
      nickname: 'Anita',
      avatarCode: 'jaguar',
    });
    const updated = await repository.updateProfile({ firstName: 'Ana', nickname: 'Nita', avatarCode: 'wolf' });
    expect(updated.ok).toBe(true);
    expect(patchBody).toEqual({ first_name: 'Ana', nickname: 'Nita', avatar_code: 'wolf' });
  });

  it('test-ca-10-http-delete-clears-storage: CA-10 limpia los tokens al borrar', async () => {
    const storage = createMemoryTokenStorage();
    await storage.write({ accessToken: 'access-http', refreshToken: 'refresh-http' });
    const repository = createHttpAuthRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage,
      fetchImpl: jest.fn(async () => jsonResponse(204)) as unknown as typeof fetch,
    });

    const result = await repository.deleteAccount('secreta12');
    expect(result).toMatchObject({ ok: true, status: 204 });
    expect(await storage.read()).toBeNull();
  });

  it('test-ca-11-http-logout-clears-storage: CA-11 cierra la sesión del dispositivo', async () => {
    const storage = createMemoryTokenStorage();
    await storage.write({ accessToken: 'access-http', refreshToken: 'refresh-http' });
    let logoutBody: Record<string, unknown> | null = null;
    const repository = createHttpAuthRepository({
      baseUrl: 'https://api.pruebas.invalid',
      storage,
      fetchImpl: jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        logoutBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return jsonResponse(204);
      }) as unknown as typeof fetch,
    });

    await repository.logout();
    expect(logoutBody).toEqual({ refresh_token: 'refresh-http' });
    expect(await storage.read()).toBeNull();
  });
});
