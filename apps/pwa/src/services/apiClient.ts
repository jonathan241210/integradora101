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
  enclosure: string | null;
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
