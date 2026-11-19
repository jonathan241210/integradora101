import type {
  SelectableSpeciesDto,
  SpeciesRequestType,
  SubmitSpeciesRequestInput,
  SubmittedSpeciesRequestDto,
} from '@arca/api-client';
import {
  FORBIDDEN_MESSAGE,
  fieldKeys,
  validateDraft,
  type FieldErrors,
  type SpeciesRequestDraft,
} from '@/viewmodels/speciesRequestForm';

export type SubmitApi = {
  publicationRequests: {
    submit(input: SubmitSpeciesRequestInput): Promise<SubmittedSpeciesRequestDto>;
  };
};

export type SubmitOutcome =
  | { kind: 'created'; notice: string; requestType: SpeciesRequestType | null }
  | { kind: 'invalid'; errors: FieldErrors; general: string; reloadSelector: boolean }
  | { kind: 'session' }
  | { kind: 'forbidden'; message: string }
  | { kind: 'failed'; message: string };

export const GENERIC_SUBMIT_ERROR = 'No se pudo enviar la solicitud. Inténtalo de nuevo.';

export function createdNotice(requestType: SpeciesRequestType | null): string {
  return requestType === 'update'
    ? 'Actualización enviada. La ficha publicada no cambia hasta que la Dirección la acepte.'
    : 'Solicitud enviada. La Dirección la revisará.';
}

function statusOf(error: unknown): number | null {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : null;
}

/** Mapea `errors` del 422; lo que no tiene control propio pasa a aviso general. */
export function mapValidationErrors(error: unknown): { errors: FieldErrors; general: string } {
  const raw = (typeof error === 'object' && error !== null && 'errors' in error
    ? (error as { errors?: Record<string, string[]> }).errors
    : undefined) ?? {};
  const errors: FieldErrors = {};
  const others: string[] = [];

  for (const [key, messages] of Object.entries(raw)) {
    const message = Array.isArray(messages) ? messages[0] : undefined;
    if (!message) continue;
    if ((fieldKeys as string[]).includes(key)) errors[key as keyof FieldErrors] = message;
    else others.push(message);
  }

  const general = others[0] ?? (Object.keys(errors).length === 0 ? GENERIC_SUBMIT_ERROR : '');
  return { errors, general };
}

export async function submitSpeciesRequest(
  api: SubmitApi,
  draft: SpeciesRequestDraft,
  selected?: Pick<SelectableSpeciesDto, 'next_request_type'> | null,
): Promise<SubmitOutcome> {
  const local = validateDraft(draft, selected);
  if (Object.keys(local).length > 0 || draft.speciesId === null || draft.category === '') {
    return { kind: 'invalid', errors: local, general: '', reloadSelector: Boolean(local.species_id && draft.speciesId !== null) };
  }

  try {
    const created = await api.publicationRequests.submit({
      species_id: draft.speciesId,
      category: draft.category,
      scientific_name: draft.scientific_name,
      habitat: draft.habitat,
      origin: draft.origin,
      published_fields: draft.publishedFields,
      image: draft.image,
    });
    const requestType = created?.request_type ?? draft.requestType;
    return { kind: 'created', notice: createdNotice(requestType), requestType };
  } catch (error) {
    const status = statusOf(error);
    if (status === 401) return { kind: 'session' };
    if (status === 403) return { kind: 'forbidden', message: FORBIDDEN_MESSAGE };
    if (status === 422) {
      const { errors, general } = mapValidationErrors(error);
      return { kind: 'invalid', errors, general, reloadSelector: Boolean(errors.species_id) };
    }
    return { kind: 'failed', message: GENERIC_SUBMIT_ERROR };
  }
}
