import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  draftFromSpecies,
  emptyDraft,
  fichaFieldOptions,
  needsChangeConfirmation,
  notPublishedLine,
  validateDraft,
} from '@/viewmodels/speciesRequestForm';
import { submitSpeciesRequest } from '@/viewmodels/speciesRequestSubmit';
import { OwnSpeciesRequestsPresenter, type OwnSpeciesRequestsPresenterProps } from '@/views/OwnSpeciesRequestsView';
import { SpeciesRequestFormPresenter, type SpeciesRequestFormPresenterProps } from '@/views/SpeciesRequestFormPresenter';
import { makeRequest, makeSpecies } from './speciesRequestFixtures';

const noop = () => undefined;
const read = (path: string) => readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8');

function renderForm(draftPatch: Partial<ReturnType<typeof draftFromSpecies>> = {}, selected = makeSpecies()) {
  const props: SpeciesRequestFormPresenterProps = {
    selector: { status: 'ready', species: [selected], onSelect: noop, onRetry: noop },
    selected,
    draft: { ...draftFromSpecies(selected), ...draftPatch },
    errors: {},
    general: '',
    notice: '',
    busy: false,
    onChange: noop,
    onToggleField: noop,
    onImage: noop,
    onReset: noop,
    onSubmit: noop,
  };
  return renderToStaticMarkup(<SpeciesRequestFormPresenter {...props} />);
}

const listProps = (overrides: Partial<OwnSpeciesRequestsPresenterProps> = {}): OwnSpeciesRequestsPresenterProps => ({
  status: 'ready',
  requests: [],
  hasMore: false,
  page: 1,
  onRetry: noop,
  onPageChange: noop,
  ...overrides,
});
const renderList = (overrides: Partial<OwnSpeciesRequestsPresenterProps> = {}) =>
  renderToStaticMarkup(<OwnSpeciesRequestsPresenter {...listProps(overrides)} />);

/** Recorre el árbol de elementos sin DOM para encontrar botones por texto. */
function findButtons(node: ReactNode, out: ReactElement<{ children?: ReactNode; onClick?: () => void }>[] = []) {
  if (Array.isArray(node)) node.forEach((child) => findButtons(child, out));
  else if (node && typeof node === 'object' && 'props' in node) {
    const element = node as ReactElement<{ children?: ReactNode; onClick?: () => void }>;
    if (element.props.onClick) out.push(element);
    findButtons(element.props.children, out);
  }
  return out;
}

const photo = () => new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

describe('CA-20 PWA solicitud de publicación: «Qué mostrar» primero y campos condicionales', () => {
  it('ordena las secciones 1 a 4 y muestra la ayuda de los chips antes de los datos', () => {
    const markup = renderForm();
    const order = ['>Especie<', 'Qué mostrar en la ficha pública', 'Datos de la ficha', '>Enviar<'].map((text) => markup.indexOf(text));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(markup).toContain('Elige primero qué verá el visitante. Solo pedimos esos datos.');
  });

  it('muestra chips fijos deshabilitados con candado y leyenda', () => {
    const markup = renderForm();
    const fixed = markup.match(/ficha-chip--fixed/g) ?? [];
    expect(fixed).toHaveLength(3);
    const disabledChecked = (markup.match(/<input[^>]*>/g) ?? []).filter((tag) => tag.includes('disabled=""') && tag.includes('checked=""'));
    expect(disabledChecked).toHaveLength(3);
    expect(markup.match(/Siempre se muestra/g)).toHaveLength(3);
    expect(markup).toContain('icon-lock');
  });

  it('cada campo de texto aparece solo si su chip está marcado; tipo de animal y foto siempre', () => {
    const all = renderForm();
    for (const name of ['scientific_name', 'origin', 'habitat']) expect(all).toContain(`name="${name}"`);
    const some = renderForm({ publishedFields: ['habitat'] });
    expect(some).toContain('name="habitat"');
    expect(some).not.toContain('name="scientific_name"');
    expect(some).not.toContain('name="origin"');
    expect(some).toContain('name="category"');
    expect(some).toContain('id="image"');
    const none = renderForm({ publishedFields: [] });
    expect(none).toContain('name="category"');
    expect(none).toContain('id="image"');
  });

  it('declara lo que no se publicará con aria-live', () => {
    const markup = renderForm({ publishedFields: ['habitat'] });
    expect(markup).toMatch(/aria-live="polite"[^>]*>No se publicarán: Nombre científico, Área de distribución natural, Dato curioso\./);
    expect(notPublishedLine({ publishedFields: ['scientific_name', 'origin', 'habitat', 'fun_fact'] })).toBe(
      'Se publicarán todos los datos opcionales.',
    );
  });

  it('al desmarcar un chip el foco vuelve al chip', () => {
    const source = read('../views/SpeciesRequestFormPresenter.tsx');
    expect(source).toMatch(/onToggleField\(option\.key\);\s*chip\.focus\(\)/);
  });

  it('volver a marcar conserva lo escrito: el borrador no borra los textos al desmarcar', () => {
    const source = read('../viewmodels/useSpeciesRequestForm.ts');
    const toggle = source.slice(source.indexOf('function toggleField'), source.indexOf('function requestReset'));
    expect(toggle).toContain('publishedFields');
    expect(toggle).not.toMatch(/scientific_name|habitat|origin/);
  });

  it('un campo oculto no se envía y validateDraft y needsChangeConfirmation lo ignoran', async () => {
    const base = draftFromSpecies(makeSpecies());
    const draft = { ...base, publishedFields: ['habitat' as const], scientific_name: 'x'.repeat(200), image: photo() };
    expect(validateDraft(draft).scientific_name).toBeUndefined();
    expect(validateDraft({ ...draft, publishedFields: ['scientific_name'] }).scientific_name).toContain('máximo 150');

    const hiddenEdit = { ...base, origin: 'Otro lugar', publishedFields: [...base.publishedFields] };
    expect(needsChangeConfirmation({ ...hiddenEdit, publishedFields: ['scientific_name', 'origin', 'habitat'] }, base)).toBe(true);
    const baselineHidden = { ...base, publishedFields: ['habitat' as const] };
    expect(needsChangeConfirmation({ ...baselineHidden, origin: 'Otro' }, baselineHidden)).toBe(false);

    let sent: Record<string, unknown> | null = null;
    const api = { publicationRequests: { submit: async (input: Record<string, unknown>) => { sent = input; return {} as never; } } };
    await submitSpeciesRequest(api as never, { ...base, publishedFields: ['habitat'], image: photo() });
    expect(sent).not.toBeNull();
    expect(Object.keys(sent as unknown as object)).toEqual(expect.arrayContaining(['habitat', 'published_fields']));
    expect(sent).not.toHaveProperty('scientific_name');
    expect(sent).not.toHaveProperty('origin');
  });

  it('la configuración de campos es un arreglo con clave, etiqueta y límite', () => {
    expect(fichaFieldOptions.every((option) => option.key && option.label && option.maxLength > 0)).toBe(true);
    expect(emptyDraft.publishedFields).toHaveLength(fichaFieldOptions.length - 1);
  });
});

describe('CA-21 PWA solicitud de publicación: Limpiar con confirmación', () => {
  it('pide confirmación solo si hay cambios', () => {
    const baseline = draftFromSpecies(makeSpecies());
    expect(needsChangeConfirmation(baseline, baseline)).toBe(false);
    expect(needsChangeConfirmation({ ...baseline, habitat: 'Sabana' }, baseline)).toBe(true);
    const view = read('../views/SpeciesRequestFormView.tsx');
    const hook = read('../viewmodels/useSpeciesRequestForm.ts');
    expect(hook).toMatch(/function requestReset\(\)\s*{\s*if \(needsChangeConfirmation\(draft, baseline\)\) setConfirmingReset\(true\)/);
    expect(view).toContain('onReset={form.requestReset}');
    expect(view).toContain('title="Limpiar formulario"');
  });
});

describe('CA-22 PWA solicitud de publicación: «Enviar de nuevo»', () => {
  it('solo las rechazadas tienen el botón y lo llaman con su especie', () => {
    const picked: number[] = [];
    const rejected = makeRequest({ id: 5, species_id: 42, status: 'rejected', rejection_reason: 'Falta foto' });
    const element = OwnSpeciesRequestsPresenter(listProps({ requests: [rejected, makeRequest({ id: 6, status: 'submitted' })], onResubmit: (id) => picked.push(id) }));
    const buttons = findButtons(element).filter((button) => button.props.children === 'Enviar de nuevo');
    expect(buttons).toHaveLength(1);
    buttons[0].props.onClick?.();
    expect(picked).toEqual([42]);
    expect(renderList({ requests: [makeRequest({ status: 'submitted' }), makeRequest({ id: 3, status: 'accepted' })] })).not.toContain('Enviar de nuevo');
  });

  it('la vista cambia a la pestaña del formulario con la especie elegida y no cambia la API', () => {
    const parent = read('../views/SpeciesRequestView.tsx');
    expect(parent).toContain('setResubmitId(speciesId); setTab(\'form\')');
    expect(parent).toContain('initialSpeciesId={resubmitId}');
    expect(read('../views/SpeciesRequestFormView.tsx')).toContain('selectSpecies(initialSpeciesId)');
  });
});

describe('CA-23 PWA solicitud de publicación: tarjeta de «Mis solicitudes»', () => {
  it('es un article con h3, badge de estado por tono, tipo, Despublicada en advertencia y fechas con time', () => {
    const markup = renderList({
      requests: [
        makeRequest({ id: 1, common_name: 'Lobo', status: 'submitted' }),
        makeRequest({ id: 2, common_name: 'Oso', status: 'accepted', request_type: 'update', reviewed_at: '2026-11-14T15:00:00Z', species_publication_status: 'unpublished' }),
        makeRequest({ id: 3, common_name: 'Puma', status: 'rejected', reviewed_at: '2026-11-14T15:00:00Z', rejection_reason: 'Sin datos' }),
      ],
    });
    expect(markup.match(/<article class="own-request"/g)).toHaveLength(3);
    expect(markup).toContain('<h3>Lobo</h3><span class="arca-badge arca-badge--warning">Pendiente de revisión</span>');
    expect(markup).toContain('<h3>Oso</h3><span class="arca-badge arca-badge--success">Actualización publicada</span>');
    expect(markup).toContain('<h3>Puma</h3><span class="arca-badge arca-badge--danger">Rechazada</span>');
    expect(markup).toContain('<span class="arca-badge arca-badge--warning">Despublicada</span>');
    expect(markup).toContain('Primera publicación');
    expect(markup).toMatch(/Enviada <time dateTime="2026-11-10T15:00:00Z">10 nov 2026<\/time> · Decisión <time dateTime="2026-11-14T15:00:00Z">14 nov 2026<\/time>/);
  });

  it('el motivo de rechazo va en un recuadro con título y reutiliza species-summary__notice', () => {
    const markup = renderList({ requests: [makeRequest({ status: 'rejected', rejection_reason: 'Sin datos' })] });
    expect(markup).toMatch(/species-summary__notice[^>]*><strong>Motivo del rechazo<\/strong><p>Sin datos<\/p>/);
    const css = read('../styles.css');
    expect(css).toMatch(/\.own-request__reason p\s*{[^}]*overflow-wrap: anywhere/);
  });

  it('usa la escala 12/16/20 px y wrap para 360 px', () => {
    const css = read('../styles.css');
    expect(css).toMatch(/\.own-request\s*{[^}]*gap: 12px;[^}]*padding: 16px/);
    expect(css).toMatch(/\.own-requests__list\s*{[^}]*gap: 16px/);
    expect(css).toMatch(/@media \(min-width: 481px\)\s*{\s*\.own-request\s*{\s*padding: 20px/);
    expect(css).toMatch(/\.own-request__row\s*{[^}]*flex-wrap: wrap/);
  });
});

describe('CA-24 PWA solicitud de publicación: paginación, lista vacía y error', () => {
  it('muestra «Página N» entre Anterior y Siguiente (respaldo has_more del paginador compartido)', () => {
    const markup = renderList({ requests: [makeRequest()], page: 2, hasMore: true });
    expect(markup).toMatch(/Página 2[\s\S]*Anterior[\s\S]*Siguiente/);
    expect(read('../styles.css')).toMatch(/@media \(max-width: 480px\)\s*{[\s\S]*\.own-requests \.pagination-bar__actions > \.arca-button:first-child[^}]*flex: 1 1 calc\(50% - 4px\)/);
  });

  it('la lista vacía ofrece «Solicitar publicación» que cambia a la pestaña del formulario', () => {
    let called = 0;
    const markup = renderList({ status: 'empty' });
    expect(markup).toContain('Aún no has enviado solicitudes.');
    expect(markup).toContain('Solicitar publicación');
    const button = findButtons(OwnSpeciesRequestsPresenter(listProps({ status: 'empty', onRequestNew: () => { called += 1; } })))[0];
    button.props.onClick?.();
    expect(called).toBe(1);
    expect(read('../views/SpeciesRequestView.tsx')).toContain('onRequestNew={() => { setResubmitId(null); setTab(\'form\'); }}');
  });

  it('el error es un Alert con «Reintentar»', () => {
    const markup = renderList({ status: 'error' });
    expect(markup).toMatch(/arca-alert[^>]*role="alert"|role="alert"[^>]*arca-alert/);
    expect(markup).toContain('Reintentar');
  });
});

describe('CA-25 PWA solicitud de publicación: ajustes de estilo', () => {
  const css = read('../styles.css');

  it('.field-help sube a 14 px y se elimina .ficha-fields__option', () => {
    expect(css).toMatch(/\.field-help\s*{[^}]*font-size: 14px/);
    expect(css).not.toContain('ficha-fields__option');
  });

  it('el fieldset deshabilitado conserva contraste (opacidad mínima 0.7)', () => {
    expect(css).toMatch(/\.species-request-data:disabled\s*{\s*opacity: 0\.7/);
  });

  it('en 360 px el botón principal de .form-actions va arriba', () => {
    expect(css).toMatch(/\.species-request-form \.form-actions \[type="submit"\]\s*{\s*order: -1/);
  });

  it('no fija colores de marca en la feature', () => {
    const start = css.indexOf('/* pwa-005: solicitud de publicación de especie');
    expect(css.slice(start)).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
