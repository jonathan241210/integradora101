import { createHttpClient } from '@arca/api-client';

export type AnimalSummary = {
  id: number;
  tag_number: string;
  name: string;
  sex: string;
  birth_date: string | null;
  stay_status: string;
  species: string | null;
};

export type EnclosureOption = {
  id: number;
  name: string;
};

export type SpeciesOption = {
  id: number;
  common_name: string;
};

export type EvaluationKind = 'intense' | 'quick' | 'review';

export type AnimalEvaluation = {
  id: number;
  evaluation_type: string;
  evaluation_date: string;
  veterinarian: string | null;
  temperature_c: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  capillary_refill_time: number | null;
  weight_kg: number | null;
  body_condition_score: number | null;
  patient_age?: string | null;
  attitude: string | null;
  assessment_reason: string | null;
  presumptive_diagnosis: string | null;
  definitive_diagnosis: string | null;
  recommendations: string | null;
  is_fit_for_wild_release: boolean | number | null;
  follow_up_status?: string | null;
  next_review_date?: string | null;
  is_follow_up?: boolean | number | null;
  evaluation_reason?: string | null;
  findings: { id: number; organ_system: string; status: string; description: string | null }[];
  restraints: {
    id: number;
    mobilization_type: string | null;
    physical_method: string | null;
    drug: string | null;
    dose_mg_per_kg: number | null;
    dose_ml: number | null;
    administered_time: string | null;
    notes: string | null;
  }[];
  lab_samples: { id: number; sample_type: string; result_notes: string | null }[];
};

export type AnimalProfile = {
  id: number;
  tag_number: string | null;
  name: string;
  sex: string | null;
  birth_date: string | null;
  origin: string | null;
  characteristics: string | null;
  entry_date: string | null;
  stay_status: string | null;
  can_receive_visits?: number | boolean | null;
  enclosure: string | null;
  photo_path: string | null;
  species: {
    id?: number;
    common_name: string;
    scientific_name: string | null;
    category: string | null;
    conservation_status: string | null;
    habitat: string | null;
    feeding: string | null;
    longevity: string | null;
    reproduction: string | null;
  } | null;
  evaluations: AnimalEvaluation[];
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const http = createHttpClient({
  baseUrl: '',
  fetchImpl: (...args) => globalThis.fetch(...args),
});

async function request<T>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  try {
    return await http.request<T>(path, {
      method: init.method,
      body: init.body,
    });
  } catch (error) {
    if (error instanceof Error) {
      const status =
        typeof error === 'object' && 'status' in error &&
        typeof error.status === 'number'
          ? error.status
          : 0;
      const message = status === 401
        ? 'Tu sesión expiró. Inicia sesión de nuevo.'
        : status === 0
          ? 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
          : error.message;
      throw new ApiError(message, status);
    }

    throw new ApiError('No se pudo completar la solicitud.', 0);
  }
}

export async function listAnimals(search = ''): Promise<AnimalSummary[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return (await request<{ data: AnimalSummary[] }>(
    `/api/v1/staff/animals${query}`,
  )).data;
}

export async function listEnclosures(): Promise<EnclosureOption[]> {
  return (await request<{ data: EnclosureOption[] }>('/api/v1/enclosures')).data;
}

export async function listSpecies(): Promise<SpeciesOption[]> {
  const data = (await request<{ data: Array<{ id: number; common_name: string }> }>('/api/v1/species')).data;
  return data.map((item) => ({ id: item.id, common_name: item.common_name }));
}

export async function getAnimal(id: number): Promise<AnimalProfile> {
  return (await request<{ data: AnimalProfile }>(
    `/api/v1/staff/animals/${id}`,
  )).data;
}

export type NewAnimal = {
  name: string;
  species_id?: number;
  species?: string;
  tag_number: string;
  enclosure_id: number;
  sex: string;
  can_receive_visits?: 0 | 1;
  birth_date?: string;
  origin?: string;
  notes?: string;
};

export async function createAnimal(animal: NewAnimal): Promise<AnimalSummary> {
  return (await request<{ data: AnimalSummary }>('/api/v1/staff/animals', {
    method: 'POST',
    body: animal,
  })).data;
}

/** Mensaje de la API cuando existe; si no, el texto por defecto en español. */
function apiMessage(error: unknown, fallback: string): string {
  const genericShared = 'No fue posible completar la solicitud.';
  if (error instanceof Error && error.message && error.message !== genericShared) return error.message;
  return fallback;
}

function errorStatus(error: unknown): number {
  return typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number'
    ? error.status
    : 0;
}

export async function createAnimalWithPhoto(formData: FormData): Promise<AnimalSummary> {
  // Pasa por el cliente compartido: cookie de sesión y X-XSRF-TOKEN (pwa-012 CA-01).
  try {
    return (await http.request<{ data: AnimalSummary }>('/api/v1/staff/animals', {
      method: 'POST',
      body: formData,
    })).data;
  } catch (error) {
    const status = errorStatus(error);
    throw new ApiError(apiMessage(status === 0 ? null : error, 'No se pudo guardar el animal con foto.'), status);
  }
}

export async function uploadAnimalPhoto(animalId: number, file: File): Promise<{ photo_path: string | null }> {
  const formData = new FormData();
  formData.append('photo', file);
  try {
    const data = await http.request<{ data?: { photo_path: string | null } } & { photo_path?: string | null }>(
      `/api/v1/staff/animals/${animalId}/photo`,
      { method: 'POST', body: formData },
    );
    return (data?.data ?? data ?? { photo_path: null }) as { photo_path: string | null };
  } catch (error) {
    const status = errorStatus(error);
    const message = status === 404 || status === 405
      ? 'La carga de foto desde el perfil aún no está disponible en el servidor.'
      : apiMessage(status === 0 ? null : error, 'No se pudo actualizar la foto del animal.');
    throw new ApiError(message, status);
  }
}

export type UpdateAnimalStatusInput = {
  stay_status?: string;
  can_receive_visits?: 0 | 1;
  reason?: string;
};

export async function updateAnimalStatus(
  animalId: number,
  payload: UpdateAnimalStatusInput,
): Promise<{ id: number; stay_status: string; can_receive_visits: number; updated_at: string | null }> {
  return (await request<{ data: { id: number; stay_status: string; can_receive_visits: number; updated_at: string | null } }>(
    `/api/v1/staff/animals/${animalId}`,
    { method: 'PATCH', body: payload },
  )).data;
}

export async function createEvaluation(
  kind: EvaluationKind,
  animalId: number,
  data: Record<string, string>,
): Promise<{ id: number; evaluation_type: string; animal_id: number; evaluation_date: string }> {
  return (await request<{ data: { id: number; evaluation_type: string; animal_id: number; evaluation_date: string } }>(
    '/api/v1/staff/clinical-evaluations',
    {
      method: 'POST',
      body: { kind, animal_id: animalId, data: { ...data, is_follow_up: '1' } },
    },
  )).data;
}

export type SyncBootstrapResponse = {
  profile: { id: number | string; name: string };
  animals: Array<AnimalSummary & { updated_at?: string | null; deleted_at?: string | null }>;
  enclosures: Array<EnclosureOption & { updated_at?: string | null; deleted_at?: string | null }>;
  species: Array<SpeciesOption & { updated_at?: string | null; deleted_at?: string | null }>;
  cursor?: string;
  server_time?: string;
};

export type SyncChangesResponse = {
  animals: Array<AnimalSummary & { updated_at?: string | null; deleted_at?: string | null }>;
  enclosures: Array<EnclosureOption & { updated_at?: string | null; deleted_at?: string | null }>;
  species: Array<SpeciesOption & { updated_at?: string | null; deleted_at?: string | null }>;
  cursor?: string;
  has_more?: boolean;
};

export type SyncOperationInput = {
  operation_uuid: string;
  entity_type: 'animal' | 'clinical_evaluation';
  client_entity_id?: string | null;
  depends_on_client_entity_id?: string | null;
  payload: Record<string, unknown>;
};

export type SyncOperationResult = {
  operation_uuid: string;
  status: 'completed' | 'duplicate' | 'rejected' | 'retry' | string;
  entity_type?: string;
  server_id?: number | null;
  server_entity_type?: string | null;
  error_code?: string | null;
  message?: string | null;
};

export async function syncBootstrap(): Promise<SyncBootstrapResponse> {
  return (await request<{ data: SyncBootstrapResponse }>('/api/v1/staff/sync/bootstrap')).data;
}

export async function syncChanges(cursor?: string): Promise<SyncChangesResponse> {
  const params = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  return (await request<{ data: SyncChangesResponse }>(`/api/v1/staff/sync/changes${params}`)).data;
}

export async function syncOperations(operations: SyncOperationInput[]): Promise<SyncOperationResult[]> {
  return (await request<{ data: { results: SyncOperationResult[] } }>('/api/v1/staff/sync/operations', {
    method: 'POST',
    body: { operations },
  })).data.results;
}
