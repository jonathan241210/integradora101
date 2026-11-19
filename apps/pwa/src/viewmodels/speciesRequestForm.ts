import type {
  OwnSpeciesRequestDto,
  SelectableSpeciesDto,
  SpeciesCategory,
  SpeciesFichaField,
  SpeciesPublicationStatus,
  SpeciesRequestType,
} from '@arca/api-client';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png'] as const;

export const FORBIDDEN_MESSAGE = 'No tienes permiso para ver esta sección.';
export const SESSION_EXPIRED_MESSAGE = 'Tu sesión expiró.';
export const CORRECTIONS_HELP =
  'Al publicarse, una corrección cambia el dato de la especie: lo verán también la app móvil y los animales de esta especie.';
export const NO_SPECIES_HELP =
  'Si la especie que buscas no aparece, primero debe registrarse con un animal (Registrar animal).';

export const categoryOptions: { value: SpeciesCategory; label: string }[] = [
  { value: 'mammal', label: 'Mamífero' },
  { value: 'bird', label: 'Ave' },
  { value: 'reptile', label: 'Reptil' },
  { value: 'amphibian', label: 'Anfibio' },
  { value: 'fish', label: 'Pez' },
  { value: 'invertebrate', label: 'Invertebrado' },
];

/** Solo las tres claves con fuente en la solicitud (CA-11). */
export const fichaFieldOptions: { key: SpeciesFichaField; label: string }[] = [
  { key: 'scientific_name', label: 'Nombre científico' },
  { key: 'origin', label: 'Área de distribución natural' },
  { key: 'habitat', label: 'Hábitat' },
];

export const defaultFichaFields: SpeciesFichaField[] = ['scientific_name', 'origin', 'habitat'];

const speciesStatusLabels: Record<SpeciesPublicationStatus, string> = {
  not_published: 'Disponible',
  published: 'Publicada',
  unpublished: 'Despublicada',
  pending: 'Pendiente de revisión',
};

export function speciesStatusLabel(status: SpeciesPublicationStatus): string {
  return speciesStatusLabels[status] ?? status;
}

export function requestTypeLabel(type: SpeciesRequestType | null): string {
  if (type === 'publish') return 'Primera publicación';
  if (type === 'update') return 'Actualización';
  return '';
}

export function requestStatusLabel(request: Pick<OwnSpeciesRequestDto, 'status' | 'request_type'>): string {
  if (request.status === 'submitted') return 'Pendiente de revisión';
  if (request.status === 'rejected') return 'Rechazada';
  return request.request_type === 'update' ? 'Actualización publicada' : 'Publicada';
}

export function categoryLabel(category: string | null): string {
  return categoryOptions.find((option) => option.value === category)?.label ?? '';
}

export function formatDate(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'America/Mexico_City',
  });
}

/** La elegibilidad la decide la API: solo importa `next_request_type` (RN-07). */
export function isSelectable(species: Pick<SelectableSpeciesDto, 'next_request_type'>): boolean {
  return species.next_request_type === 'publish' || species.next_request_type === 'update';
}

export function lastRejectionNotice(
  species: Pick<SelectableSpeciesDto, 'last_rejection_reason'>,
): string | null {
  const reason = species.last_rejection_reason;
  return reason ? `Última solicitud rechazada: ${reason}` : null;
}

/** Descarta las claves sin fuente (CA-11). */
export function normalizePublishedFields(raw: SelectableSpeciesDto['published_fields'] | undefined): SpeciesFichaField[] | null {
  if (raw === null || raw === undefined) return null;
  return fichaFieldOptions.map((option) => option.key).filter((key) => raw.includes(key));
}

export function fichaFieldsFor(
  requestType: SpeciesRequestType | null,
  publishedFields: SelectableSpeciesDto['published_fields'] | undefined,
): SpeciesFichaField[] {
  if (requestType === 'update') {
    return normalizePublishedFields(publishedFields) ?? [...defaultFichaFields];
  }
  return [...defaultFichaFields];
}

export type SpeciesRequestDraft = {
  speciesId: number | null;
  requestType: SpeciesRequestType | null;
  scientific_name: string;
  habitat: string;
  origin: string;
  category: SpeciesCategory | '';
  publishedFields: SpeciesFichaField[];
  image: File | null;
};

export const emptyDraft: SpeciesRequestDraft = {
  speciesId: null,
  requestType: null,
  scientific_name: '',
  habitat: '',
  origin: '',
  category: '',
  publishedFields: [...defaultFichaFields],
  image: null,
};

export function draftFromSpecies(species: SelectableSpeciesDto): SpeciesRequestDraft {
  return {
    speciesId: species.id,
    requestType: species.next_request_type,
    scientific_name: species.scientific_name ?? '',
    habitat: species.habitat ?? '',
    origin: species.origin ?? '',
    category: species.category ?? '',
    publishedFields: fichaFieldsFor(species.next_request_type, species.published_fields),
    image: null,
  };
}

/** True si el usuario escribió algo respecto a la precarga (CA-14). */
export function needsChangeConfirmation(
  draft: SpeciesRequestDraft,
  baseline: SpeciesRequestDraft | null,
): boolean {
  if (!baseline) return false;
  if (draft.image) return true;
  return (
    draft.scientific_name !== baseline.scientific_name ||
    draft.habitat !== baseline.habitat ||
    draft.origin !== baseline.origin ||
    draft.category !== baseline.category ||
    draft.publishedFields.join(',') !== baseline.publishedFields.join(',')
  );
}

export type FieldKey =
  | 'species_id'
  | 'category'
  | 'image'
  | 'scientific_name'
  | 'habitat'
  | 'origin'
  | 'published_fields';
export type FieldErrors = Partial<Record<FieldKey, string>>;

export const fieldKeys: FieldKey[] = [
  'species_id',
  'category',
  'image',
  'scientific_name',
  'habitat',
  'origin',
  'published_fields',
];

type PhotoLike = { type: string; size: number };

export function validatePhoto(file: PhotoLike | null, requestType: SpeciesRequestType | null): string | null {
  if (!file) return requestType === 'publish' ? 'Elige una foto para la primera publicación.' : null;
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) return 'Elige una imagen JPG o PNG.';
  if (file.size > MAX_PHOTO_BYTES) return 'La foto no puede superar 5 MB.';
  return null;
}

export const NOT_ELIGIBLE_MESSAGE = 'Ya hay una solicitud pendiente para esta especie.';

/**
 * `selected` es la especie vigente del selector tras cualquier recarga: si ya
 * no es elegible (RN-07), no se envía (CA-06).
 */
export function validateDraft(
  draft: SpeciesRequestDraft,
  selected?: Pick<SelectableSpeciesDto, 'next_request_type'> | null,
): FieldErrors {
  const errors: FieldErrors = {};
  if (draft.speciesId === null) errors.species_id = 'Elige una especie.';
  else if (selected !== undefined && (selected === null || !isSelectable(selected))) {
    errors.species_id = NOT_ELIGIBLE_MESSAGE;
  }
  if (!draft.category) errors.category = 'Tipo de animal requerido.';
  const photoError = validatePhoto(draft.image, draft.requestType);
  if (photoError && draft.speciesId !== null) errors.image = photoError;
  return errors;
}

/** Primer campo con error en el orden visual del formulario. */
export function firstErrorField(errors: FieldErrors): FieldKey | null {
  return fieldKeys.find((key) => errors[key]) ?? null;
}
