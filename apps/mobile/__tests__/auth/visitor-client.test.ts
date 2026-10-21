import { createVisitorApi } from '@arca/api-client';

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

describe('Cliente HTTP del visitante', () => {
  it('test-ca-06-visitor-refresh-single-flight: un 401 concurrente renueva una sola vez', async () => {
    let accessToken = 'old-access';
    let refreshToken = 'old-refresh';
    let refreshCalls = 0;
    const authorizations: Array<string | null> = [];

    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get('Authorization');
      authorizations.push(authorization);
      if (url.endsWith('/api/v1/visitor/auth/refresh')) {
        refreshCalls += 1;
        accessToken = 'new-access';
        refreshToken = 'new-refresh';
        return jsonResponse(200, {
          data: {
            token_type: 'Bearer',
            expires_in: 900,
            access_token: accessToken,
            refresh_token: refreshToken,
            visitor: profile,
          },
        });
      }
      if (authorization === 'Bearer new-access') {
        return jsonResponse(200, { data: profile });
      }
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });

    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => accessToken,
      getRefreshToken: async () => refreshToken,
      onTokens: async (tokens) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
      onSessionExpired: async () => undefined,
    });

    const profiles = await Promise.all([api.me(), api.me(), api.me()]);
    expect(profiles).toHaveLength(3);
    expect(refreshCalls).toBe(1);
    expect(authorizations.filter((value) => value === 'Bearer new-access')).toHaveLength(3);
  });

  it('test-ca-06-visitor-refresh-single-flight: un refresh fallido no dispara otro', async () => {
    let refreshCalls = 0;
    let expired = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse(401, { message: 'La sesión ya no es válida. Vuelve a entrar.' });
      }
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });

    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'old-access',
      getRefreshToken: async () => 'old-refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => {
        expired += 1;
      },
    });

    await expect(Promise.all([api.me(), api.me()])).rejects.toMatchObject({ status: 401 });
    expect(refreshCalls).toBe(1);
    expect(expired).toBeGreaterThan(0);
  });
});
