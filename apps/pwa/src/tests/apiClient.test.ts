import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  createAnimal,
  createEvaluation,
  listEnclosures,
  listAnimals,
} from '@/services/apiClient';

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    headers: new Headers(),
    text: () => Promise.resolve(JSON.stringify(body)),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('PWA API client', () => {
  it('CA-01 guarda animales con cookie de sesión y protección CSRF', async () => {
    const animal = {
      id: 12,
      tag_number: 'JAG-TEST-12',
      name: 'Jaguar de prueba',
      species: 'Jaguar',
      sex: 'F',
      age: null,
      stay_status: 'Cuarentena_Ingreso',
    };
    const fetchMock = stubFetch(201, { data: animal });
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf%2Dtoken' });

    await expect(createAnimal({
      name: 'Jaguar de prueba',
      species: 'Jaguar',
      tag_number: 'JAG-TEST-12',
      enclosure_id: 1,
      sex: 'hembra',
    })).resolves.toEqual(animal);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/staff\/animals$/);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('csrf-token');
    expect(JSON.parse(String(init.body))).toEqual({
      name: 'Jaguar de prueba',
      species: 'Jaguar',
      tag_number: 'JAG-TEST-12',
      enclosure_id: 1,
      sex: 'hembra',
    });
  });

  it('CA-03 carga los recintos disponibles para el registro', async () => {
    const enclosures = [{ id: 1, name: 'Zona de Felinos y Sabana' }];
    const fetchMock = stubFetch(200, { data: enclosures });

    await expect(listEnclosures()).resolves.toEqual(enclosures);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/enclosures$/);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('carga animales usando la sesión de Sanctum bajo el mismo origen', async () => {
    const fetchMock = stubFetch(200, { data: [] });

    await expect(listAnimals()).resolves.toEqual([]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/v1\/staff\/animals$/);
    expect(init.method).toBe('GET');
    expect(init.credentials).toBe('include');
  });

  it('CA-02 muestra el rechazo del servidor al guardar un animal', async () => {
    const fetchMock = stubFetch(422, { message: 'Datos inválidos.' });
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf%2Dtoken' });

    await expect(createAnimal({
      name: 'Jaguar',
      species: 'Jaguar',
      tag_number: 'JAG-TEST',
      enclosure_id: 1,
      sex: 'unknown',
    })).rejects.toMatchObject({
      message: 'Datos inválidos.',
      status: 422,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('CA-02 informa cuando no hay conexión al guardar un animal', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network'));
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=csrf%2Dtoken' });

    await expect(createAnimal({
      name: 'Jaguar',
      species: 'Jaguar',
      tag_number: 'JAG-TEST',
      enclosure_id: 1,
      sex: 'unknown',
    })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
  });

  it('mantiene deshabilitado el guardado de registros clínicos', async () => {
    const fetchMock = stubFetch(201, { data: { id: 1 } });

    await expect(
      createEvaluation('quick', 7, { 'quick-reason': 'Control' }),
    ).rejects.toMatchObject({
      message: expect.stringContaining('no está habilitado'),
      status: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
