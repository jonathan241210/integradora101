import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { draftFromSpecies, emptyDraft } from '@/viewmodels/speciesRequestForm';
import { createdNotice } from '@/viewmodels/speciesRequestSubmit';
import { SpeciesRequestView } from '@/views/SpeciesRequestView';
import { HomeView } from '@/views/HomeView';
import { SpeciesRequestFormPresenter, type SpeciesRequestFormPresenterProps } from '@/views/SpeciesRequestFormPresenter';
import { SpeciesSelectorField } from '@/views/SpeciesSelectorField';
import { makeSpecies } from './speciesRequestFixtures';

const noop = () => undefined;

function renderForm(overrides: Partial<SpeciesRequestFormPresenterProps> = {}, species = [makeSpecies()]) {
  const selected = overrides.selected ?? null;
  return renderToStaticMarkup(
    <SpeciesRequestFormPresenter
      selector={{ status: 'ready', species, onSelect: noop, onRetry: noop }}
      selected={selected}
      draft={selected ? draftFromSpecies(selected) : emptyDraft}
      errors={{}}
      general=""
      notice=""
      busy={false}
      onChange={noop}
      onToggleField={noop}
      onImage={noop}
      onSubmit={noop}
      {...overrides}
    />,
  );
}

/** Solo los chips opcionales (name="published_fields"); los fijos van aparte (CA-20). */
function checkedBoxes(markup: string) {
  return (markup.match(/<input[^>]*type="checkbox"[^>]*>/g) ?? []).filter(
    (tag) => tag.includes('name="published_fields"') && tag.includes('checked=""'),
  );
}

function renderSelector(status: 'loading' | 'ready' | 'empty' | 'error' | 'forbidden', species = [makeSpecies()]) {
  return renderToStaticMarkup(
    <SpeciesSelectorField status={status} species={species} selectedId={null} onSelect={noop} onRetry={noop} />,
  );
}

describe('CA-01 PWA solicitud de publicación: formulario', () => {
  it('presenta selector, tipo de envío, correcciones, tipo de animal, foto y bloque de ficha', () => {
    const selected = makeSpecies();
    const markup = renderForm({ selected });
    for (const text of [
      'Especie',
      'Nombre común:',
      'Jaguar',
      'Tipo de envío:',
      'Primera publicación',
      'Nombre científico',
      'Hábitat',
      'Área de distribución natural',
      'Tipo de animal',
      'Foto',
      'Qué mostrar en la ficha pública',
    ]) {
      expect(markup).toContain(text);
    }
  });
});

describe('CA-04 PWA solicitud de publicación: foto', () => {
  it('en actualización avisa que sin foto nueva se mantiene la publicada', () => {
    const selected = makeSpecies({ publication_status: 'published', next_request_type: 'update' });
    expect(renderForm({ selected })).toContain('Sin foto nueva se mantiene la foto publicada.');
    expect(renderForm({ selected: makeSpecies() })).not.toContain('Sin foto nueva');
  });
});

describe('CA-07 PWA solicitud de publicación: sin estado tras envío', () => {
  it('tras el envío el formulario solo muestra el aviso y no el estado de la solicitud', () => {
    const notice = createdNotice('publish');
    // Formulario vacío tras 201; el selector recargado no se renderiza aquí.
    const markup = renderForm({ notice }, []).replace(/<fieldset class="species-selector".*?<\/fieldset>/s, '');
    expect(markup).toContain(notice);
    for (const status of ['Pendiente de revisión', 'Rechazada', 'Publicada', 'Despublicada']) {
      expect(markup).not.toContain(status);
    }
    expect(notice).not.toMatch(/Pendiente|Rechazada|Publicada/);
  });
});

describe('CA-09 PWA solicitud de publicación: ficha pública', () => {
  it('muestra cuatro casillas (tres marcadas; «Dato curioso» opcional) y declara lo que siempre se muestra', () => {
    const markup = renderForm({ selected: makeSpecies() });
    expect(markup.match(/name="published_fields"/g)).toHaveLength(4);
    expect(checkedBoxes(markup)).toHaveLength(3);
    for (const fixed of ['Nombre común', 'Tipo de animal', 'Foto']) expect(markup).toContain(fixed);
    expect(markup).toContain('Siempre se muestra');
  });

  it('en actualización precarga las casillas desde published_fields', () => {
    const selected = makeSpecies({ publication_status: 'published', next_request_type: 'update', published_fields: ['habitat'] });
    expect(checkedBoxes(renderForm({ selected }))).toHaveLength(1);
  });
});

describe('CA-11 PWA solicitud de publicación: campos sin fuente', () => {
  it('no muestra las seis casillas sin fuente', () => {
    const markup = renderForm({ selected: makeSpecies() });
    for (const text of ['Estado de conservación', 'Tamaño', 'Gestación', 'Alimentación', 'Esperanza de vida', 'Características']) {
      expect(markup).not.toContain(text);
    }
  });
});

describe('CA-06 PWA solicitud de publicación: especie no elegible', () => {
  it('deshabilita «Enviar solicitud» si la especie elegida ya no es elegible', () => {
    const pending = makeSpecies({ publication_status: 'pending', next_request_type: null });
    const markup = renderForm({ selected: pending }, [pending]);
    expect(markup).toMatch(/<button[^>]*disabled=""[^>]*>Enviar solicitud/);
    const eligible = renderForm({ selected: makeSpecies() });
    expect(eligible).not.toMatch(/<button[^>]*disabled=""[^>]*>Enviar solicitud/);
  });

  it('deshabilita la sección de datos y pide elegir una especie hasta que haya una', () => {
    const markup = renderForm({ selected: null });
    expect(markup).toMatch(/<fieldset[^>]*species-request-data[^>]*disabled=""|<fieldset[^>]*disabled=""[^>]*species-request-data/);
    expect(markup).toContain('Elige una especie para continuar.');
    const withSpecies = renderForm({ selected: makeSpecies() });
    expect(withSpecies).not.toContain('Elige una especie para continuar.');
    expect(withSpecies).not.toMatch(/<fieldset[^>]*disabled=""[^>]*species-request-data/);
  });
});

describe('CA-12 PWA solicitud de publicación: tipo de animal', () => {
  it('ofrece las seis opciones y muestra el error de category junto al selector', () => {
    const markup = renderForm({ selected: makeSpecies(), errors: { category: 'Tipo de animal requerido.' } });
    for (const label of ['Mamífero', 'Ave', 'Reptil', 'Anfibio', 'Pez', 'Invertebrado']) {
      expect(markup).toContain(`>${label}</option>`);
    }
    expect(markup).toContain('Tipo de animal requerido.');
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain('aria-describedby="category-error"');
  });
});

describe('CA-13 PWA solicitud de publicación: selector', () => {
  it('muestra carga con role status', () => {
    const markup = renderSelector('loading');
    expect(markup).toContain('role="status"');
    expect(markup).toContain('Cargando especies…');
  });

  it('es un desplegable con placeholder y opciones «Nombre · Estado»; pending va deshabilitada', () => {
    const markup = renderSelector('ready', [
      makeSpecies({ id: 1, common_name: 'Jaguar', publication_status: 'published', next_request_type: 'update' }),
      makeSpecies({ id: 2, common_name: 'Lobo', publication_status: 'pending', next_request_type: null }),
    ]);
    expect(markup).toContain('<select');
    expect(markup).not.toContain('type="radio"');
    expect(markup).toContain('Selecciona una especie');
    expect(markup).toContain('Jaguar · Publicada');
    expect(markup).toMatch(/<option[^>]*disabled=""[^>]*>Lobo · Pendiente de revisión<\/option>/);
    expect(markup.match(/<option[^>]*disabled=""/g)).toHaveLength(1);
  });

  it('muestra bajo el desplegable el resumen de la especie elegida con su estado y tipo de envío', () => {
    const selected = makeSpecies({ publication_status: 'published', next_request_type: 'update' });
    const markup = renderForm({ selected }, [selected]);
    expect(markup).toContain('species-summary');
    expect(markup).toContain('arca-badge');
    expect(markup).toContain('Publicada');
    expect(markup).toContain('Actualización');
  });

  it('muestra error con Reintentar y lista vacía', () => {
    const error = renderSelector('error', []);
    expect(error).toContain('No pudimos cargar las especies. Inténtalo más tarde.');
    expect(error).toContain('Reintentar');
    expect(renderSelector('empty', [])).toContain('Aún no hay especies registradas. Regístralas primero con un animal.');
  });
});

describe('CA-14 PWA solicitud de publicación: precarga', () => {
  it('muestra el texto de ayuda sobre correcciones y los valores precargados', () => {
    const markup = renderForm({ selected: makeSpecies() });
    expect(markup).toContain(
      'Solo puedes corregir los datos que se publican. Al publicarse, una corrección cambia el dato de la especie: lo verán también la app móvil y los animales de esta especie.',
    );
    expect(markup).toContain('value="Panthera onca"');
    expect(markup).toContain('value="Selva"');
  });
});

describe('CA-15 PWA solicitud de publicación: sin alta', () => {
  it('no tiene controles de alta ni nombre común editable, y remite a pwa-004', () => {
    const markup = renderForm({ selected: makeSpecies() });
    expect(markup).not.toContain('name="common_name"');
    expect(markup).not.toContain('name="species"');
    expect(markup).not.toMatch(/Nueva especie|Crear especie|Agregar especie/);
    expect(markup).toContain('primero debe registrarse con un animal');
  });
});

describe('CA-13 PWA solicitud de publicación: selector con error', () => {
  it('el selector no muestra errores como éxito: el error aparece con role alert', () => {
    expect(renderSelector('error', [])).toContain('role="alert"');
  });
});

describe('CA-18 PWA solicitud de publicación: motivo completo', () => {
  it('muestra íntegro el motivo de 500 caracteres bajo el desplegable, en un bloque de alerta suave', () => {
    const reason = 'c'.repeat(500);
    const selected = makeSpecies({ last_rejection_reason: reason });
    const markup = renderForm({ selected }, [selected]);
    expect(markup).toContain(`Última solicitud rechazada: ${reason}`);
    expect(markup).toContain('arca-alert');
  });

  it('sin motivo no muestra el aviso', () => {
    const selected = makeSpecies({ publication_status: 'published', next_request_type: 'update' });
    expect(renderForm({ selected }, [selected])).not.toContain('Última solicitud rechazada');
  });
});

describe('CA-19 PWA solicitud de publicación: sesión y permisos', () => {
  it('403 en el selector muestra el mensaje y ninguna vista de la feature llama a fetch', () => {
    expect(renderSelector('forbidden', [])).toContain('No tienes permiso para ver esta sección.');
    const views = [
      'SpeciesRequestView.tsx',
      'SpeciesRequestFormView.tsx',
      'SpeciesRequestFormPresenter.tsx',
      'SpeciesSelectorField.tsx',
      'OwnSpeciesRequestsView.tsx',
    ];
    for (const view of views) {
      const source = readFileSync(fileURLToPath(new URL(`../views/${view}`, import.meta.url)), 'utf8');
      expect(source, view).not.toMatch(/\bfetch\(|axios/);
    }
  });
});

describe('RN-01 PWA solicitud de publicación: acceso', () => {
  it('la entrada solo aparece si roles incluye veterinarian', () => {
    const withRole = renderToStaticMarkup(<HomeView onNavigate={noop} roles={['veterinarian']} />);
    const otherRole = renderToStaticMarkup(<HomeView onNavigate={noop} roles={['zoo-admin']} />);
    const noRoles = renderToStaticMarkup(<HomeView onNavigate={noop} />);
    expect(withRole).toContain('Solicitar publicación de especie');
    expect(otherRole).not.toContain('Solicitar publicación de especie');
    expect(noRoles).not.toContain('Solicitar publicación de especie');
  });
});

describe('RN-03 PWA solicitud de publicación: foto sin URL', () => {
  it('el markup no contiene URL de la foto ni rutas de media', () => {
    const markup = renderForm({ selected: makeSpecies() });
    expect(markup).not.toMatch(/media\/|species-requests|<img/);
  });
});

describe('CA-01 PWA solicitud de publicación: maqueta del formulario', () => {
  it('tiene área de foto, rejilla de correcciones y pie con «Limpiar» y «Enviar solicitud»', () => {
    const markup = renderForm({ selected: makeSpecies() });
    expect(markup).toContain('image-upload-area');
    expect(markup).toContain('form-grid');
    expect(markup).toContain('ficha-chip');
    expect(markup).toMatch(/form-actions[\s\S]*Limpiar[\s\S]*Enviar solicitud/);
  });

  it('muestra vista previa con botón para quitar la foto solo cuando hay una', () => {
    expect(renderForm({ selected: makeSpecies() })).not.toContain('<img');
    const markup = renderForm({ selected: makeSpecies(), photoPreview: 'blob:local' });
    expect(markup).toContain('src="blob:local"');
    expect(markup).toContain('aria-label="Quitar foto"');
  });
});

describe('CA-13 PWA solicitud de publicación: pestañas', () => {
  it('las pestañas son un control segmentado con aria-pressed', () => {
    const markup = renderToStaticMarkup(<SpeciesRequestView />);
    expect(markup).toContain('segmented');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('Mis solicitudes');
  });
});
