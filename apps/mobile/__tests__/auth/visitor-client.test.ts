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
  it('la base que ya incluye /api/v1 no duplica la ruta del visitante', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return jsonResponse(200, { data: profile });
    });

    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid/api/v1',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => undefined,
    });

    await api.me();
    expect(urls).toEqual(['https://api.pruebas.invalid/api/v1/visitor/me']);
  });

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

  it('test-ca-06-visitor-refresh-single-flight: dos clientes con el mismo token renuevan una sola vez', async () => {
    let accessToken = 'old-access';
    let refreshToken = 'old-refresh';
    let refreshCalls = 0;
    let expired = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get('Authorization');
      if (url.endsWith('/api/v1/visitor/auth/refresh')) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
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
      if (authorization === 'Bearer new-access') return jsonResponse(200, { data: profile });
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });
    const options = {
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => accessToken,
      getRefreshToken: async () => refreshToken,
      onTokens: async (tokens: { accessToken: string; refreshToken: string }) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
      onSessionExpired: async () => {
        expired += 1;
        accessToken = '';
        refreshToken = '';
      },
    };
    const profileClient = createVisitorApi(options);
    const memoryClient = createVisitorApi(options);

    const profiles = await Promise.all([profileClient.me(), memoryClient.me()]);
    expect(profiles).toHaveLength(2);
    expect(refreshCalls).toBe(1);
    expect(expired).toBe(0);
    expect(accessToken).toBe('new-access');
    expect(refreshToken).toBe('new-refresh');
  });

  it('test-ca-06-visitor-refresh-single-flight: un 401 tardío no borra el par nuevo', async () => {
    let accessToken = 'old-access';
    let refreshToken = 'old-refresh';
    let refreshCalls = 0;
    let expired = 0;
    let releaseLate!: () => void;
    const late = new Promise<void>((resolve) => {
      releaseLate = resolve;
    });
    let oldAccessRequests = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const authorization = new Headers(init?.headers).get('Authorization');
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
      if (authorization === 'Bearer new-access') return jsonResponse(200, { data: profile });
      oldAccessRequests += 1;
      if (oldAccessRequests === 1) return jsonResponse(401, { message: 'Unauthenticated.' });
      await late;
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });
    const options = {
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => accessToken,
      getRefreshToken: async () => refreshToken,
      onTokens: async (tokens: { accessToken: string; refreshToken: string }) => {
        accessToken = tokens.accessToken;
        refreshToken = tokens.refreshToken;
      },
      onSessionExpired: async () => {
        expired += 1;
        accessToken = '';
        refreshToken = '';
      },
    };
    const first = createVisitorApi(options).me();
    const second = createVisitorApi(options).me();
    await first;
    releaseLate();

    const profiles = await Promise.all([first, second]);
    expect(profiles).toHaveLength(2);
    expect(refreshCalls).toBe(1);
    expect(expired).toBe(0);
    expect(accessToken).toBe('new-access');
  });

  it('test-ca-06-visitor-refresh-single-flight: un 401 tras dos rotaciones no borra la sesión', async () => {
    let accessToken = 'old-access';
    let expired = 0;
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer old-access') {
        accessToken = 'second-access';
        return jsonResponse(401, { message: 'Unauthenticated.' });
      }
      if (authorization === 'Bearer second-access') {
        accessToken = 'third-access';
        return jsonResponse(401, { message: 'Unauthenticated.' });
      }
      if (authorization === 'Bearer third-access') return jsonResponse(200, { data: profile });
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });

    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => accessToken,
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => {
        expired += 1;
        accessToken = '';
      },
    });

    await expect(api.me()).resolves.toEqual(profile);
    expect(expired).toBe(0);
    expect(accessToken).toBe('third-access');
  });

  it('test-ca-06: conserva el par que cambia mientras lee el cuerpo de un 401', async () => {
    let accessToken = 'first-access';
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const authorization = new Headers(init?.headers).get('Authorization');
      if (authorization === 'Bearer first-access') {
        accessToken = 'second-access';
        return jsonResponse(401, { message: 'Unauthenticated.' });
      }
      if (authorization === 'Bearer second-access') {
        const response = jsonResponse(401, { message: 'Unauthenticated.' });
        jest.spyOn(response, 'text').mockImplementation(async () => {
          accessToken = 'third-access';
          return '{"message":"Unauthenticated."}';
        });
        return response;
      }
      expect(authorization).toBe('Bearer third-access');
      return jsonResponse(200, { data: profile });
    });
    const onSessionExpired = jest.fn(async () => {
      accessToken = '';
    });
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => accessToken,
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired,
    });

    await expect(api.me()).resolves.toEqual(profile);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(accessToken).toBe('third-access');
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

  it('test-ca-06-visitor-refresh-single-flight: perder la red al renovar conserva la sesión', async () => {
    let expired = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/auth/refresh')) {
        throw new TypeError('Network request failed');
      }
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => {
        expired += 1;
      },
    });

    await expect(api.me()).rejects.toMatchObject({ status: 0, message: 'Sin conexión' });
    expect(expired).toBe(0);
  });

  it('test-ca-06-visitor-refresh-single-flight: un 503 al renovar conserva la sesión', async () => {
    let expired = 0;
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/auth/refresh')) {
        return jsonResponse(503, { message: 'Servicio no disponible.' });
      }
      return jsonResponse(401, { message: 'Unauthenticated.' });
    });
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => {
        expired += 1;
      },
    });

    await expect(api.me()).rejects.toMatchObject({ status: 503 });
    expect(expired).toBe(0);
  });

  it('CA-06 visitor-memories lista conserva data y meta sin reglas de plazo', async () => {
    const fetchImpl = jest.fn(async () => jsonResponse(200, {
      data: [{ id: 4, status: 'submitted', opinion: null, created_at: null, reviewed_at: null, resubmitted_count: 0 }],
      meta: { can_submit: false, next_submission_at: '2026-11-21T18:00:00Z', open_request_id: 4 },
    }));
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => undefined,
    });

    await expect(api.listVisitorMemories()).resolves.toEqual({
      data: [{ id: 4, status: 'submitted', opinion: null, created_at: null, reviewed_at: null, resubmitted_count: 0 }],
      meta: { can_submit: false, next_submission_at: '2026-11-21T18:00:00Z', open_request_id: 4 },
    });
  });

  it('CA-04 visitor-memories envía multipart sin Content-Type json y omite la opinión vacía', async () => {
    const bodies: Array<RequestInit['body']> = [];
    const contentTypes: Array<string | null> = [];
    const fetchImpl = jest.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(init?.body ?? null);
      contentTypes.push(new Headers(init?.headers).get('Content-Type'));
      return jsonResponse(201, {
        data: { id: 8, status: 'submitted', opinion: null, created_at: null, reviewed_at: null, resubmitted_count: 0 },
      });
    });
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => undefined,
    });

    await api.submitVisitorMemory({
      image: { uri: 'file:///foto.jpg', name: 'foto.jpg', mimeType: 'image/jpeg' },
      opinion: '   ',
      consent: true,
    });

    const form = bodies[0] as FormData;
    expect(form).toBeInstanceOf(FormData);
    expect(contentTypes[0]).toBeNull();
    expect(String(form)).not.toMatch(/7 d[ií]as|published_until|can_submit/);
    const entries = [...form.entries()].map(([key]) => key);
    expect(entries).toEqual(['image', 'consent']);
  });

  it('CA-16 visitor-memories reenvía a la misma petición e incluye la opinión', async () => {
    const urls: string[] = [];
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return jsonResponse(200, {
        data: { id: 8, status: 'submitted', opinion: 'Otra', created_at: null, reviewed_at: null, resubmitted_count: 1 },
      });
    });
    const api = createVisitorApi({
      baseUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
      getAccessToken: async () => 'access',
      getRefreshToken: async () => 'refresh',
      onTokens: async () => undefined,
      onSessionExpired: async () => undefined,
    });

    await api.resubmitVisitorMemory(8, {
      opinion: 'Otra',
      consent: true,
    });
    expect(urls).toEqual(['https://api.pruebas.invalid/api/v1/visitor/memories/8/resubmit']);
  });
});
