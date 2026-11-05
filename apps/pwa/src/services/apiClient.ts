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
