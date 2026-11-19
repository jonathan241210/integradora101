import { describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  categoryOptions,
  draftFromSpecies,
  emptyDraft,
  fichaFieldOptions,
  fichaFieldsFor,
  isSelectable,
  lastRejectionNotice,
  needsChangeConfirmation,
  speciesStatusLabel,
  validateDraft,
  validatePhoto,
} from '@/viewmodels/speciesRequestForm';
import { makeSpecies } from './speciesRequestFixtures';

describe('CA-04 PWA solicitud de publicación: foto', () => {
  it('rechaza más de 5 MB sin enviar', () => {
    expect(validatePhoto({ type: 'image/png', size: MAX_PHOTO_BYTES + 1 }, 'publish')).toBe('La foto no puede superar 5 MB.');
    expect(validatePhoto({ type: 'image/png', size: MAX_PHOTO_BYTES }, 'publish')).toBeNull();
  });

  it('solo acepta JPG y PNG', () => {
    expect(validatePhoto({ type: 'image/gif', size: 10 }, 'publish')).toBe('Elige una imagen JPG o PNG.');
    expect(validatePhoto({ type: 'image/jpeg', size: 10 }, 'update')).toBeNull();
  });

  it('exige foto en la primera publicación y la deja opcional en la actualización', () => {
    expect(validatePhoto(null, 'publish')).toBe('Elige una foto para la primera publicación.');
    expect(validatePhoto(null, 'update')).toBeNull();
    const draft = { ...draftFromSpecies(makeSpecies()), image: null };
    expect(validateDraft(draft).image).toBe('Elige una foto para la primera publicación.');
  });
});

describe('CA-06 PWA solicitud de publicación: especie no elegible', () => {
  it('la especie pending (next_request_type nulo) no es elegible y su estado va en texto', () => {
    const pending = makeSpecies({ publication_status: 'pending', next_request_type: null });
    expect(isSelectable(pending)).toBe(false);
    expect(speciesStatusLabel(pending.publication_status)).toBe('Pendiente de revisión');
  });

  it('si la especie elegida pasa a pending tras recargar, el envío se bloquea', () => {
    const draft = draftFromSpecies(makeSpecies());
    const stale = makeSpecies({ publication_status: 'pending', next_request_type: null });
    expect(validateDraft(draft, stale).species_id).toBe('Ya hay una solicitud pendiente para esta especie.');
    expect(validateDraft(draft, null).species_id).toBe('Ya hay una solicitud pendiente para esta especie.');
    expect(validateDraft({ ...draft, image: new File(['x'], 'a.png', { type: 'image/png' }) }, makeSpecies()).species_id).toBeUndefined();
  });

  it('sin especie elegida no hay envío', () => {
    expect(validateDraft(emptyDraft).species_id).toBe('Elige una especie.');
  });
});

describe('RN-07 PWA solicitud de publicación: elegibilidad de la API', () => {
  it('el estado deshabilitado depende solo de next_request_type', () => {
    expect(isSelectable(makeSpecies({ publication_status: 'published', next_request_type: 'update' }))).toBe(true);
    expect(isSelectable(makeSpecies({ publication_status: 'unpublished', next_request_type: 'update' }))).toBe(true);
    expect(isSelectable(makeSpecies({ publication_status: 'not_published', next_request_type: 'publish' }))).toBe(true);
    // Aunque el estado parezca elegible, manda la API.
    expect(isSelectable(makeSpecies({ publication_status: 'not_published', next_request_type: null }))).toBe(false);
  });
});

describe('CA-09 PWA solicitud de publicación: ficha pública', () => {
  it('en primera publicación marca los tres predeterminados', () => {
    expect(fichaFieldsFor('publish', null)).toEqual(['scientific_name', 'origin', 'habitat']);
  });

  it('en actualización precarga la selección de la especie publicada (lista)', () => {
    expect(fichaFieldsFor('update', ['habitat'])).toEqual(['habitat']);
    expect(fichaFieldsFor('update', ['scientific_name', 'habitat'])).toEqual(['scientific_name', 'habitat']);
    expect(fichaFieldsFor('update', [])).toEqual([]);
  });

  it('en actualización sin selección guardada usa los predeterminados', () => {
    expect(fichaFieldsFor('update', null)).toEqual(['scientific_name', 'origin', 'habitat']);
  });
});

describe('CA-11 PWA solicitud de publicación: campos sin fuente', () => {
  it('solo ofrece tres casillas y no las seis sin fuente', () => {
    const labels = fichaFieldOptions.map((option) => option.label);
    expect(labels).toEqual(['Nombre científico', 'Área de distribución natural', 'Hábitat']);
    for (const missing of ['Estado de conservación', 'Tamaño', 'Gestación', 'Alimentación', 'Esperanza de vida', 'Características']) {
      expect(labels).not.toContain(missing);
    }
    expect(fichaFieldsFor('update', ['size', 'habitat'] as never)).toEqual(['habitat']);
  });
});

describe('CA-12 PWA solicitud de publicación: tipo de animal', () => {
  it('ofrece las seis opciones con etiquetas y claves en inglés', () => {
    expect(categoryOptions).toEqual([
      { value: 'mammal', label: 'Mamífero' },
      { value: 'bird', label: 'Ave' },
      { value: 'reptile', label: 'Reptil' },
      { value: 'amphibian', label: 'Anfibio' },
      { value: 'fish', label: 'Pez' },
      { value: 'invertebrate', label: 'Invertebrado' },
    ]);
  });

  it('con el selector vacío no envía y pide el tipo', () => {
    const draft = draftFromSpecies(makeSpecies({ category: null }));
    expect(validateDraft({ ...draft, image: new File(['x'], 'a.png', { type: 'image/png' }) }).category).toBe('Tipo de animal requerido.');
  });
});

describe('CA-13 PWA solicitud de publicación: selector', () => {
  it('etiqueta los cuatro estados', () => {
    expect(speciesStatusLabel('not_published')).toBe('Disponible');
    expect(speciesStatusLabel('published')).toBe('Publicada');
    expect(speciesStatusLabel('unpublished')).toBe('Despublicada');
    expect(speciesStatusLabel('pending')).toBe('Pendiente de revisión');
  });
});

describe('CA-14 PWA solicitud de publicación: precarga', () => {
  it('precarga correcciones, tipo y ficha desde la especie', () => {
    const draft = draftFromSpecies(
      makeSpecies({ id: 7, publication_status: 'published', next_request_type: 'update', published_fields: ['origin'] }),
    );
    expect(draft).toMatchObject({
      speciesId: 7,
      requestType: 'update',
      scientific_name: 'Panthera onca',
      habitat: 'Selva',
      origin: 'América',
      category: 'mammal',
      publishedFields: ['origin'],
    });
  });

  it('pide confirmación al cambiar de especie solo si hay datos escritos', () => {
    const baseline = draftFromSpecies(makeSpecies());
    expect(needsChangeConfirmation(baseline, baseline)).toBe(false);
    expect(needsChangeConfirmation({ ...baseline, habitat: 'Sabana' }, baseline)).toBe(true);
    expect(needsChangeConfirmation(baseline, null)).toBe(false);
  });
});

describe('CA-18 PWA solicitud de publicación: motivo completo', () => {
  it('muestra el motivo de 500 caracteres íntegro en el selector', () => {
    const reason = 'a'.repeat(500);
    const notice = lastRejectionNotice(makeSpecies({ last_rejection_reason: reason }));
    expect(notice).toBe(`Última solicitud rechazada: ${reason}`);
  });

  it('sin last_rejection_reason (otros estados) no muestra aviso', () => {
    expect(lastRejectionNotice(makeSpecies({ publication_status: 'published', last_rejection_reason: null }))).toBeNull();
  });
});
