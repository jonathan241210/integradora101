import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoginView } from '@/views/LoginView';
import { createHttpClient, createVeterinarianApi } from '@arca/api-client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { draftFromSpecies, type SpeciesRequestDraft } from '@/viewmodels/speciesRequestForm';
import { submitSpeciesRequest } from '@/viewmodels/speciesRequestSubmit';
import { expiredSession } from '@/viewmodels/useStaffSession';
import { apiError, jsonResponse, makeSpecies } from './speciesRequestFixtures';

const photo = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

function validDraft(overrides: Partial<SpeciesRequestDraft> = {}): SpeciesRequestDraft {
  return { ...draftFromSpecies(makeSpecies()), image: photo(), ...overrides };
}

function fakeApi(result: unknown, fail = false) {
  const submit = vi.fn(async () => {
    if (fail) throw result;
    return result as never;
  });
  return { api: { publicationRequests: { submit } }, submit };
}

afterEach(() => vi.unstubAllGlobals());

describe('CA-02 PWA solicitud de publicación: envío', () => {
  it('llama a publicationRequests.submit con los datos y la foto del formulario', async () => {
    const { api, submit } = fakeApi({ id: 1, species_id: 1, status: 'submitted', request_type: 'publish', created_at: 'x' });
    const draft = validDraft();
    const outcome = await submitSpeciesRequest(api, draft);

    expect(outcome.kind).toBe('created');
    expect(submit).toHaveBeenCalledWith({
      species_id: 1,
      category: 'mammal',
      scientific_name: 'Panthera onca',
      habitat: 'Selva',
      origin: 'América',
      published_fields: ['scientific_name', 'origin', 'habitat'],
      image: draft.image,
    });
  });

  it('no llama a la API con datos inválidos', async () => {
    const { api, submit } = fakeApi({});
    const outcome = await submitSpeciesRequest(api, validDraft({ category: '', image: null }));
    expect(outcome.kind).toBe('invalid');
    expect(submit).not.toHaveBeenCalled();
  });

  it('ante error HTTP devuelve un resultado que no limpia el formulario', async () => {
    const { api } = fakeApi(apiError(500), true);
    const outcome = await submitSpeciesRequest(api, validDraft());
    expect(outcome.kind).toBe('failed');
  });
});

describe('CA-03 PWA solicitud de publicación: respuestas', () => {
  it('201 muestra el aviso según request_type (RN-10)', async () => {
    const publish = await submitSpeciesRequest(
      fakeApi({ request_type: 'publish' }).api,
      validDraft(),
    );
    const update = await submitSpeciesRequest(
      fakeApi({ request_type: 'update' }).api,
      validDraft({ requestType: 'update' }),
    );
    expect(publish).toMatchObject({ kind: 'created', notice: 'Solicitud enviada. La Dirección la revisará.' });
    expect(update).toMatchObject({
      kind: 'created',
      notice: 'Actualización enviada. La ficha publicada no cambia hasta que la Dirección la acepte.',
    });
  });

  it('422 mapea errores por campo y aviso general para campos sin control', async () => {
    const { api } = fakeApi(
      apiError(422, { habitat: ['Hábitat: máximo 150 caracteres.'], common_name: ['Campo no permitido: common_name.'] }),
      true,
    );
    const outcome = await submitSpeciesRequest(api, validDraft());
    expect(outcome).toMatchObject({
      kind: 'invalid',
      errors: { habitat: 'Hábitat: máximo 150 caracteres.' },
      general: 'Campo no permitido: common_name.',
      reloadSelector: false,
    });
  });

  it('401 lleva a inicio de sesión con «Tu sesión expiró.» y no informa éxito', async () => {
    vi.stubGlobal('document', { cookie: 'XSRF-TOKEN=t' });
    const onUnauthorized = vi.fn();
    const fetchImpl = vi.fn(async () => jsonResponse({ message: 'no' }, 401));
    const api = createVeterinarianApi(createHttpClient({ baseUrl: '', fetchImpl: fetchImpl as unknown as typeof fetch, onUnauthorized }));

    const outcome = await submitSpeciesRequest(api, validDraft());
    expect(outcome.kind).toBe('session');
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(expiredSession).toMatchObject({ session: 'anonymous', error: 'Tu sesión expiró.' });
  });

  it('500 y error de red muestran error genérico sin limpiar', async () => {
    const serverError = await submitSpeciesRequest(fakeApi(apiError(500), true).api, validDraft());
    const network = await submitSpeciesRequest(fakeApi(new TypeError('fetch failed'), true).api, validDraft());
    expect(serverError).toMatchObject({ kind: 'failed', message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' });
    expect(network.kind).toBe('failed');
  });
});

describe('CA-06 PWA solicitud de publicación: especie no elegible', () => {
  it('un 422 de species_id muestra el mensaje y pide recargar la lista', async () => {
    const message = 'Ya hay una solicitud pendiente para esta especie.';
    const outcome = await submitSpeciesRequest(fakeApi(apiError(422, { species_id: [message] }), true).api, validDraft());
    expect(outcome).toMatchObject({ kind: 'invalid', errors: { species_id: message }, reloadSelector: true });
  });
});

describe('CA-06 PWA solicitud de publicación: especie que pasó a pendiente', () => {
  it('no llama a la API si la especie vigente ya no es elegible y pide recargar', async () => {
    const { api, submit } = fakeApi({});
    const pending = makeSpecies({ publication_status: 'pending', next_request_type: null });
    const outcome = await submitSpeciesRequest(api, validDraft(), pending);
    expect(outcome).toMatchObject({
      kind: 'invalid',
      errors: { species_id: 'Ya hay una solicitud pendiente para esta especie.' },
      reloadSelector: true,
    });
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('CA-08 PWA solicitud de publicación: foto no procesable', () => {
  it('el 422 de image conserva el texto exacto de la API', async () => {
    const message = 'No se pudo procesar la foto. Intenta con otro archivo.';
    const outcome = await submitSpeciesRequest(fakeApi(apiError(422, { image: [message] }), true).api, validDraft());
    expect(outcome).toMatchObject({ kind: 'invalid', errors: { image: message } });
  });
});

describe('CA-10 PWA solicitud de publicación: selección de ficha', () => {
  it('un 422 de published_fields se asocia al bloque y no pierde las casillas', async () => {
    const draft = validDraft({ publishedFields: ['habitat'] });
    const outcome = await submitSpeciesRequest(
      fakeApi(apiError(422, { published_fields: ['La selección de campos públicos no es válida.'] }), true).api,
      draft,
    );
    expect(outcome).toMatchObject({ kind: 'invalid', errors: { published_fields: 'La selección de campos públicos no es válida.' } });
    expect(draft.publishedFields).toEqual(['habitat']);
  });
});

describe('CA-12 PWA solicitud de publicación: tipo de animal', () => {
  it('un 422 de category se asocia al selector de tipo de animal', async () => {
    const outcome = await submitSpeciesRequest(
      fakeApi(apiError(422, { category: ['Tipo de animal no válido.'] }), true).api,
      validDraft(),
    );
    expect(outcome).toMatchObject({ kind: 'invalid', errors: { category: 'Tipo de animal no válido.' } });
  });
});

describe('CA-19 PWA solicitud de publicación: sesión y permisos', () => {
  it('el cliente de la feature avisa al manejador de sesión ante un 401 y el login muestra el aviso', async () => {
    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ message: 'no' }, 401)));
    const { onVeterinarianUnauthorized, veterinarianApi } = await import('@/services/veterinarianApi');
    const handler = vi.fn();
    onVeterinarianUnauthorized(handler);

    await expect(veterinarianApi.species.list()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);

    const markup = renderToStaticMarkup(
      createElement(LoginView, { error: expiredSession.error, onLogin: () => undefined }),
    );
    expect(markup).toContain('Tu sesión expiró.');
    expect(markup).toContain('role="alert"');

    const app = readFileSync(fileURLToPath(new URL('../App.tsx', import.meta.url)), 'utf8');
    expect(app).toContain('onVeterinarianUnauthorized(expireSession)');
  });

  it('403 en el envío muestra «No tienes permiso para ver esta sección.»', async () => {
    const outcome = await submitSpeciesRequest(fakeApi(apiError(403), true).api, validDraft());
    expect(outcome).toEqual({ kind: 'forbidden', message: 'No tienes permiso para ver esta sección.' });
  });
});
