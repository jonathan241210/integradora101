import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  draftFromSpecies,
  fichaFieldOptions,
  needsChangeConfirmation,
  validateDraft,
  FUN_FACT_HELP,
} from '@/viewmodels/speciesRequestForm';
import { submitSpeciesRequest } from '@/viewmodels/speciesRequestSubmit';
import { SpeciesRequestFormPresenter } from '@/views/SpeciesRequestFormPresenter';
import { makeSpecies } from './speciesRequestFixtures';

const noop = () => undefined;
const photo = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });
const twenty = 'a'.repeat(20);

function render(patch: Partial<ReturnType<typeof draftFromSpecies>> = {}) {
  const selected = makeSpecies();
  return renderToStaticMarkup(
    <SpeciesRequestFormPresenter
      selector={{ status: 'ready', species: [selected], onSelect: noop, onRetry: noop }}
      selected={selected}
      draft={{ ...draftFromSpecies(selected), ...patch }}
      errors={{}}
      general=""
      notice=""
      busy={false}
      onChange={noop}
      onToggleField={noop}
      onImage={noop}
      onReset={noop}
      onSubmit={noop}
    />,
  );
}

describe('api-026 CA-02 PWA: Dato curioso obligatorio con mínimo de 20 si está marcado', () => {
  it('chip opcional, desmarcado por defecto, con ayuda y textarea de 4 filas y contador', () => {
    expect(fichaFieldOptions.map((o) => o.key)).toContain('fun_fact');
    expect(render()).not.toContain('name="fun_fact"');
    const markup = render({ publishedFields: ['fun_fact'], fun_fact: 'hola' });
    expect(markup).toContain('<textarea');
    expect(markup).toContain('rows="4"');
    expect(markup).toContain('name="fun_fact"');
    expect(markup).toContain(FUN_FACT_HELP);
    expect(markup).toMatch(/>4<\/span>\/<!-- -->500|4<!-- -->\/<!-- -->500|>4<\/span>/);
  });

  it('marcado exige 20 caracteres; con 20 pasa', () => {
    const base = { ...draftFromSpecies(makeSpecies()), image: photo() };
    const marked = { ...base, publishedFields: ['fun_fact' as const] };
    expect(validateDraft({ ...marked, fun_fact: 'a'.repeat(19) }).fun_fact).toBe('Dato curioso: escribe al menos 20 caracteres.');
    expect(validateDraft({ ...marked, fun_fact: ' ' + 'a'.repeat(19) + ' ' }).fun_fact).toBeDefined();
    expect(validateDraft({ ...marked, fun_fact: twenty }).fun_fact).toBeUndefined();
  });
});

describe('api-026 CA-03 PWA: máximo de 500 caracteres', () => {
  it('rechaza 501 y acepta 500', () => {
    const marked = { ...draftFromSpecies(makeSpecies()), publishedFields: ['fun_fact' as const] };
    expect(validateDraft({ ...marked, fun_fact: 'a'.repeat(501) }).fun_fact).toBe('Dato curioso: máximo 500 caracteres.');
    expect(validateDraft({ ...marked, fun_fact: 'a'.repeat(500) }).fun_fact).toBeUndefined();
  });
});

describe('api-026 CA-04 PWA: sin marcar el texto no se envía', () => {
  it('oculto no se envía y no se valida; marcado se envía', async () => {
    const submit = vi.fn().mockResolvedValue({ request_type: 'publish' });
    const api = { publicationRequests: { submit } } as never;
    const base = { ...draftFromSpecies(makeSpecies()), image: photo(), fun_fact: 'corto' };
    expect((await submitSpeciesRequest(api, base)).kind).toBe('created');
    expect(submit.mock.calls[0][0]).not.toHaveProperty('fun_fact');
    expect(submit.mock.calls[0][0].published_fields).not.toContain('fun_fact');
    expect(needsChangeConfirmation({ ...base, image: null }, draftFromSpecies(makeSpecies()))).toBe(false);

    const marked = { ...base, publishedFields: [...base.publishedFields, 'fun_fact' as const], fun_fact: twenty };
    await submitSpeciesRequest(api, marked);
    expect(submit.mock.calls[1][0].fun_fact).toBe(twenty);
  });
});

describe('api-026 CA-14 PWA: precarga del dato curioso vigente en una actualización', () => {
  it('toma fun_fact del selector y marca el chip si estaba publicado', () => {
    const species = makeSpecies({
      publication_status: 'published',
      next_request_type: 'update',
      published_fields: ['habitat', 'fun_fact'],
      fun_fact: 'Duerme hasta veinte horas al día.',
    });
    const draft = draftFromSpecies(species);
    expect(draft.fun_fact).toBe('Duerme hasta veinte horas al día.');
    expect(draft.publishedFields).toEqual(['habitat', 'fun_fact']);
    expect(draftFromSpecies(makeSpecies()).fun_fact).toBe('');
  });
});
