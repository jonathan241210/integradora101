import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, createEvaluation, login } from '@/services/apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PWA API client', () => {
  it('envía el diagnóstico a la API con el tipo y el animal', async () => {
    const fetchMock = stubFetch(201, { data: { id: 1 } });

    await createEvaluation('quick', 7, { 'quick-reason': 'Control' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/clinical-evaluations$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      kind: 'quick',
      animal_id: 7,
      data: { 'quick-reason': 'Control' },
    });
  });

  it('expone el mensaje de validación de la API', async () => {
    stubFetch(422, { message: 'Credenciales incorrectas.' });

    await expect(login('a@b.com', 'x')).rejects.toMatchObject({
      message: 'Credenciales incorrectas.',
      status: 422,
    });
  });

  it('informa cuando no hay conexión con el servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network')));

    await expect(login('a@b.com', 'x')).rejects.toBeInstanceOf(ApiError);
  });
});
