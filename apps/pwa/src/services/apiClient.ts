export type AnimalSummary = {
  id: number;
  tag_number: string;
  name: string;
  sex: string;
  age: string | null;
  stay_status: string;
  species: string | null;
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
  attitude: string | null;
  assessment_reason: string | null;
  presumptive_diagnosis: string | null;
  definitive_diagnosis: string | null;
  recommendations: string | null;
  is_fit_for_wild_release: boolean | number | null;
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
  age: string | null;
  origin: string | null;
  longevity: string | null;
  reproduction: string | null;
  diet: string | null;
  characteristics: string | null;
  entry_date: string | null;
  stay_status: string | null;
  enclosure: string | null;
  species: {
    common_name: string;
    scientific_name: string | null;
    category: string | null;
    conservation_status: string | null;
    habitat: string | null;
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

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const baseUrl = (env?.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

type ValidationBody = { message?: string; errors?: Record<string, string[]> };

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
      0,
    );
  }

  const body = (await response.json().catch(() => ({}))) as ValidationBody;

  if (!response.ok) {
    const firstError = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    throw new ApiError(
      firstError ?? body.message ?? 'No se pudo completar la solicitud.',
      response.status,
    );
  }

  return body as T;
}

export async function listAnimals(search = ''): Promise<AnimalSummary[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return (await request<{ data: AnimalSummary[] }>(`/staff/animals${query}`)).data;
}

export async function getAnimal(id: number): Promise<AnimalProfile> {
  return (await request<{ data: AnimalProfile }>(`/staff/animals/${id}`)).data;
}

export type NewAnimal = {
  name: string;
  species: string;
  tag_number: string;
  sex: string;
  birth_date?: string;
  origin?: string;
  notes?: string;
};

export async function createAnimal(animal: NewAnimal): Promise<AnimalSummary> {
  return (await request<{ data: AnimalSummary }>('/staff/animals', { method: 'POST', body: animal })).data;
}

export async function createEvaluation(
  kind: EvaluationKind,
  animalId: number,
  data: Record<string, string>,
): Promise<void> {
  await request('/staff/clinical-evaluations', {
    method: 'POST',
    body: { kind, animal_id: animalId, data },
  });
}
