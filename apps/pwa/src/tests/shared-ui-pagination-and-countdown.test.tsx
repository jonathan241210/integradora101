import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { formatCountdown, LockoutNotice, startCountdown, useCountdown } from '@arca/ui';
import { createVeterinarianApi } from '@arca/api-client';
import { loadOwnRequests } from '@/viewmodels/useOwnSpeciesRequests';
import { OwnSpeciesRequestsPresenter } from '@/views/OwnSpeciesRequestsView';
import { makeRequest } from './speciesRequestFixtures';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const read = (path: string) => readFileSync(`${root}${path}`, 'utf8');
const noop = () => undefined;

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(OwnSpeciesRequestsPresenter, {
      status: 'ready',
      requests: [makeRequest()],
      hasMore: true,
      page: 2,
      lastPage: 3,
      total: 25,
      onRetry: noop,
      onPageChange: noop,
      ...props,
    } as never),
  );

describe('CA-26 PWA solicitud de publicación: «Mis solicitudes» con el paginador compartido', () => {
  it('usa el componente de @arca/ui con total y números de página', () => {
    const html = render({});
    expect(html).toContain('Página 2 de 3 · 25 en total');
    expect(html).toContain('aria-label="Ir a la página 3"');
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('aria-label="Paginación"');
    expect(read('apps/pwa/src/views/OwnSpeciesRequestsView.tsx')).toMatch(/Pagination[^;]*from '@arca\/ui'/s);
    expect(read('apps/pwa/src/views/OwnSpeciesRequestsView.tsx')).not.toContain('own-requests__pager');
  });

  it('con una sola página no muestra paginador', () => {
    expect(render({ hasMore: false, page: 1, lastPage: 1, total: 1 })).not.toContain('Paginación');
  });

  it('el viewmodel toma el total de meta y el cliente lo normaliza', async () => {
    const meta = { current_page: 1, last_page: 3, per_page: 10, total: 25, has_more: true };
    const state = await loadOwnRequests(
      { publicationRequests: { list: async () => ({ data: [makeRequest()], meta }) } },
      1,
    );
    expect(state).toMatchObject({ status: 'ready', hasMore: true, lastPage: 3, total: 25 });

    const api = createVeterinarianApi({ get: async () => ({ data: [makeRequest()], meta }) } as never);
    expect((await api.publicationRequests.list(1)).meta).toEqual(meta);
  });

  it('a 360 px Anterior y Siguiente ocupan 50 % cada uno y los números pasan a la fila de abajo', () => {
    const css = read('apps/pwa/src/styles.css');
    expect(css).toMatch(/@media \(max-width: 480px\)\s*{[\s\S]*\.own-requests \.pagination-bar__actions > \.arca-button:first-child,\s*\.own-requests \.pagination-bar__actions > \.arca-button:last-child\s*{\s*flex: 1 1 calc\(50% - 4px\)/);
    expect(css).not.toContain('.own-requests__pager');
  });
});

describe('CA-09 PWA staff-login: contador de bloqueo movido a @arca/ui', () => {
  it('el contador, el aviso y el hook salen del paquete compartido con el mismo comportamiento', () => {
    expect(formatCountdown(600)).toBe('10:00');
    expect(formatCountdown(42)).toBe('0:42');
    expect(typeof startCountdown).toBe('function');
    expect(typeof useCountdown).toBe('function');
    const html = renderToStaticMarkup(
      createElement(LockoutNotice, {
        countdown: { remaining: 500, running: true, finished: false },
        initialSeconds: 587,
        alertClassName: 'login-error',
      }),
    );
    expect(html).toContain('login-error');
    expect(html).toContain('arca-visually-hidden');
    expect(html).toContain('aria-live="off"');
    expect(html).toContain('>8:20<');
  });

  it('la PWA no conserva copias locales del contador ni del aviso', () => {
    for (const path of [
      'apps/pwa/src/viewmodels/countdown.ts',
      'apps/pwa/src/viewmodels/useCountdown.ts',
      'apps/pwa/src/components/LockoutNotice.tsx',
    ]) {
      expect(existsSync(`${root}${path}`), path).toBe(false);
    }
    expect(read('apps/pwa/src/views/LoginView.tsx')).toMatch(/useCountdown[^;]*from '@arca\/ui'/s);
    expect(read('apps/pwa/src/viewmodels/useStaffSession.ts')).toContain("from '@arca/ui'");
  });
});
