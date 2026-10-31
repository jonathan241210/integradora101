export type AuthUser = { id: number; name: string; email: string };

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

const TOKEN_KEY = 'zoohealth.token';

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const baseUrl = (env?.VITE_API_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '');

// sessionStorage limita la exposición del token en dispositivos compartidos.
export function getToken(): string | null {
  try {
    return globalThis.sessionStorage?.getItem(TOKEN_KEY) ?? null;
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  try {
    if (token) globalThis.sessionStorage?.setItem(TOKEN_KEY, token);
    else globalThis.sessionStorage?.removeItem(TOKEN_KEY);
  } catch {
    // Sin almacenamiento disponible la sesión dura solo mientras la página siga abierta.
  }
}

let unauthorizedHandler: (() => void) | null = null;

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

type ValidationBody = { message?: string; errors?: Record<string, string[]> };

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    if (response.status === 401 && token) {
      setToken(null);
      unauthorizedHandler?.();
    }
    const firstError = body.errors ? Object.values(body.errors)[0]?.[0] : undefined;
    throw new ApiError(
      firstError ?? body.message ?? 'No se pudo completar la solicitud.',
      response.status,
    );
  }

  return body as T;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const result = await request<{ token: string; user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: { email, password, device_name: 'pwa' },
  });
  setToken(result.token);
  return result.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  return (await request<{ user: AuthUser }>('/auth/me')).user;
}

export async function logout(): Promise<void> {
  try {
    await request('/auth/logout', { method: 'POST' });
  } catch {
    // El token local se descarta aunque el servidor no responda.
  }
  setToken(null);
}

export async function listAnimals(search = ''): Promise<AnimalSummary[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return (await request<{ data: AnimalSummary[] }>(`/animals${query}`)).data;
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
  return (await request<{ data: AnimalSummary }>('/animals', { method: 'POST', body: animal })).data;
}

export async function createEvaluation(
  kind: EvaluationKind,
  animalId: number,
  data: Record<string, string>,
): Promise<void> {
  await request('/clinical-evaluations', {
    method: 'POST',
    body: { kind, animal_id: animalId, data },
  });
}
