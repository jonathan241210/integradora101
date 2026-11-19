import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { requestStatusLabel, requestTypeLabel } from '@/viewmodels/speciesRequestForm';
import { loadOwnRequests } from '@/viewmodels/useOwnSpeciesRequests';
import { loadSpecies } from '@/viewmodels/useSpeciesSelector';
import { OwnSpeciesRequestsPresenter } from '@/views/OwnSpeciesRequestsView';
import { apiError, makeRequest, makeSpecies } from './speciesRequestFixtures';

const noop = () => undefined;

function render(props: Partial<Parameters<typeof OwnSpeciesRequestsPresenter>[0]>) {
  return renderToStaticMarkup(
    createElement(OwnSpeciesRequestsPresenter, {
      status: 'ready',
      requests: [],
      hasMore: false,
      page: 1,
      onRetry: noop,
      onNext: noop,
      onPrevious: noop,
      ...props,
    }),
  );
}

const listApi = (result: () => Promise<{ data: ReturnType<typeof makeRequest>[]; meta: { has_more: boolean } }>) => ({
  publicationRequests: { list: result },
});

describe('CA-16 PWA solicitud de publicación: mis solicitudes', () => {
  it('etiqueta estado y tipo de envío', () => {
    expect(requestStatusLabel({ status: 'submitted', request_type: 'publish' })).toBe('Pendiente de revisión');
    expect(requestStatusLabel({ status: 'accepted', request_type: 'publish' })).toBe('Publicada');
    expect(requestStatusLabel({ status: 'accepted', request_type: 'update' })).toBe('Actualización publicada');
    expect(requestStatusLabel({ status: 'rejected', request_type: 'update' })).toBe('Rechazada');
    expect(requestTypeLabel('publish')).toBe('Primera publicación');
    expect(requestTypeLabel('update')).toBe('Actualización');
  });

  it('muestra nombre, tipo, estado y fechas, y «Despublicada» solo si unpublished', () => {
    const markup = render({
      requests: [
        makeRequest({ id: 2, common_name: 'Lobo', status: 'accepted', request_type: 'update', reviewed_at: '2026-11-12T15:00:00Z', species_publication_status: 'unpublished' }),
        makeRequest({ id: 1, common_name: 'Jaguar', species_publication_status: 'published' }),
      ],
    });
    expect(markup).toContain('Lobo');
    expect(markup).toContain('Actualización publicada');
    expect(markup).toContain('Enviada el');
    expect(markup).toContain('Decisión el');
    expect(markup.match(/Despublicada/g)).toHaveLength(1);
  });

  it('conserva el orden que entrega la API', async () => {
    const rows = [makeRequest({ id: 9 }), makeRequest({ id: 3 })];
    const state = await loadOwnRequests(listApi(async () => ({ data: rows, meta: { has_more: false } })), 1);
    expect(state.requests.map((row) => row.id)).toEqual([9, 3]);
  });
});

describe('CA-17 PWA solicitud de publicación: estados de la lista', () => {
  it('muestra carga con role status, vacío y error con Reintentar', () => {
    expect(render({ status: 'loading' })).toContain('role="status"');
    expect(render({ status: 'loading' })).toContain('Cargando tus solicitudes…');
    expect(render({ status: 'empty' })).toContain('Aún no has enviado solicitudes.');
    const error = render({ status: 'error' });
    expect(error).toContain('No pudimos cargar tus solicitudes. Inténtalo más tarde.');
    expect(error).toContain('Reintentar');
  });

  it('un error vacía la lista y no deja datos anteriores', async () => {
    const state = await loadOwnRequests(listApi(async () => { throw apiError(500); }), 1);
    expect(state).toEqual({ status: 'error', requests: [], hasMore: false });
  });

  it('pagina según meta.has_more', async () => {
    const state = await loadOwnRequests(listApi(async () => ({ data: [makeRequest()], meta: { has_more: true } })), 1);
    expect(state.hasMore).toBe(true);
    expect(render({ requests: [makeRequest()], hasMore: true, page: 2 })).toContain('Siguiente');
    expect(render({ requests: [makeRequest()], hasMore: true, page: 2 })).toContain('Anterior');
    const lastFirstPage = render({ requests: [makeRequest()], hasMore: false, page: 1 });
    expect(lastFirstPage).not.toContain('Siguiente');
    expect(lastFirstPage).not.toContain('Anterior');
  });
});

describe('CA-18 PWA solicitud de publicación: motivo completo', () => {
  it('muestra el motivo de 500 caracteres íntegro en la lista', () => {
    const reason = 'b'.repeat(500);
    const markup = render({
      requests: [makeRequest({ status: 'rejected', rejection_reason: reason })],
    });
    expect(markup).toContain(reason);
    expect(markup).toContain('Rechazada');
  });
});

describe('CA-19 PWA solicitud de publicación: sesión y permisos', () => {
  it('403 en la lista y en el selector muestra el mensaje de permiso', async () => {
    const own = await loadOwnRequests(listApi(async () => { throw apiError(403); }), 1);
    const species = await loadSpecies({ species: { list: async () => { throw apiError(403); } } });
    expect(own.status).toBe('forbidden');
    expect(species.status).toBe('forbidden');
    expect(render({ status: 'forbidden' })).toContain('No tienes permiso para ver esta sección.');
  });

  it('el selector distingue vacío, listo y error', async () => {
    expect((await loadSpecies({ species: { list: async () => [] } })).status).toBe('empty');
    expect((await loadSpecies({ species: { list: async () => [makeSpecies()] } })).status).toBe('ready');
    expect((await loadSpecies({ species: { list: async () => { throw apiError(500); } } })).status).toBe('error');
  });
});
