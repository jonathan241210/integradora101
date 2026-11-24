import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createHttpClient, createVeterinarianApi } from '@arca/api-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse } from './speciesRequestFixtures';

function client(fetchImpl: typeof fetch, onUnauthorized?: () => void) {
  vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=token' });
  return createVeterinarianApi(createHttpClient({ baseUrl: '', fetchImpl, onUnauthorized }));
}

afterEach(() => vi.unstubAllGlobals());

const png = () => new File(['x'], 'foto.png', { type: 'image/png' });

describe('CA-05 PWA solicitud de publicación: campos', () => {
  it('envía multipart con species_id, correcciones, category, published_fields e image', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: { id: 1, species_id: 3, status: 'submitted', request_type: 'publish', created_at: 'x' } }, 201));
    const api = client(fetchImpl as unknown as typeof fetch);

    await api.publicationRequests.submit({
      species_id: 3,
      category: 'bird',
      scientific_name: 'Ara macao',
      habitat: 'Selva',
      origin: 'México',
      published_fields: ['scientific_name'],
      image: png(),
    });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/v1/veterinarian/species-publication-requests');
    expect(init.method).toBe('POST');
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()].sort()).toEqual(
      ['category', 'habitat', 'image', 'origin', 'published_fields', 'scientific_name', 'species_id'].sort(),
    );
    expect(body.get('species_id')).toBe('3');
    expect(body.get('category')).toBe('bird');
    expect(body.has('common_name')).toBe(false);
    expect(body.has('species')).toBe(false);
    expect(body.has('request_type')).toBe(false);
    expect(new Headers(init.headers).get('X-XSRF-TOKEN')).toBe('token');
  });

  it('omite la foto cuando no hay archivo', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: {} }, 201));
    await client(fetchImpl as unknown as typeof fetch).publicationRequests.submit({
      species_id: 1,
      category: 'fish',
      published_fields: [],
    });
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as FormData;
    expect(body.has('image')).toBe(false);
  });
});

describe('CA-10 PWA solicitud de publicación: selección de ficha', () => {
  it('envía published_fields como cadena JSON, incluido []', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: {} }, 201));
    const api = client(fetchImpl as unknown as typeof fetch);

    await api.publicationRequests.submit({ species_id: 1, category: 'bird', published_fields: ['scientific_name', 'origin', 'habitat'] });
    await api.publicationRequests.submit({ species_id: 1, category: 'bird', published_fields: [] });

    const bodies = fetchImpl.mock.calls.map((call) => ((call as unknown as [string, RequestInit])[1].body as FormData).get('published_fields'));
    expect(bodies).toEqual(['["scientific_name","origin","habitat"]', '[]']);
  });
});

describe('CA-19 PWA solicitud de publicación: sesión y permisos', () => {
  it('un 401 en cualquier llamada avisa al manejador de sesión', async () => {
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'No autenticado' }, 401));
    const api = client(fetchImpl as unknown as typeof fetch, onUnauthorized);

    await expect(api.species.list()).rejects.toMatchObject({ status: 401 });
    await expect(api.publicationRequests.list(1)).rejects.toMatchObject({ status: 401 });
    expect(onUnauthorized).toHaveBeenCalledTimes(2);
  });

  it('un 422 conserva errors intactos', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'x', errors: { image: ['No se pudo procesar la foto. Intenta con otro archivo.'] } }, 422));
    const api = client(fetchImpl as unknown as typeof fetch);
    await expect(
      api.publicationRequests.submit({ species_id: 1, category: 'bird', published_fields: [] }),
    ).rejects.toMatchObject({ status: 422, errors: { image: ['No se pudo procesar la foto. Intenta con otro archivo.'] } });
  });

  it('lista con ?page= solo desde la página 2 y normaliza meta.has_more', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ data: [], meta: { has_more: true } }));
    const api = client(fetchImpl as unknown as typeof fetch);
    const first = await api.publicationRequests.list(1);
    await api.publicationRequests.list(2);
    const urls = fetchImpl.mock.calls.map((call) => (call as unknown as [string])[0]);
    expect(urls).toEqual([
      '/api/v1/veterinarian/species-publication-requests',
      '/api/v1/veterinarian/species-publication-requests?page=2',
    ]);
    expect(first.meta.has_more).toBe(true);
  });
});

describe('RN-02 PWA solicitud de publicación: sin alta de especie', () => {
  it('el cliente solo expone lectura del selector, lista y envío de solicitud', () => {
    const api = createVeterinarianApi(createHttpClient({ baseUrl: '', fetchImpl: vi.fn() as unknown as typeof fetch }));
    expect(Object.keys(api)).toEqual(['species', 'publicationRequests']);
    expect(Object.keys(api.species)).toEqual(['list']);
    expect(Object.keys(api.publicationRequests).sort()).toEqual(['list', 'submit']);
  });
});

describe('RN-04 PWA solicitud de publicación: sin credenciales en cliente', () => {
  it('los archivos de la feature no usan almacenamiento ni cookies', () => {
    const files = [
      '../services/veterinarianApi.ts',
      '../viewmodels/speciesRequestForm.ts',
      '../viewmodels/speciesRequestSubmit.ts',
      '../viewmodels/useSpeciesSelector.ts',
      '../viewmodels/useOwnSpeciesRequests.ts',
      '../viewmodels/useSpeciesRequestForm.ts',
      '../views/SpeciesRequestView.tsx',
      '../views/SpeciesRequestFormView.tsx',
      '../views/SpeciesRequestFormPresenter.tsx',
      '../views/SpeciesSelectorField.tsx',
      '../views/OwnSpeciesRequestsView.tsx',
    ];
    for (const file of files) {
      const source = readFileSync(fileURLToPath(new URL(file, import.meta.url)), 'utf8');
      expect(source, file).not.toMatch(/localStorage|sessionStorage|document\.cookie/);
    }
  });
});
