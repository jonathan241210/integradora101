import type { OwnSpeciesRequestDto, SelectableSpeciesDto } from '@arca/api-client';

export function makeSpecies(overrides: Partial<SelectableSpeciesDto> = {}): SelectableSpeciesDto {
  return {
    id: 1,
    common_name: 'Jaguar',
    scientific_name: 'Panthera onca',
    habitat: 'Selva',
    origin: 'América',
    category: 'mammal',
    publication_status: 'not_published',
    next_request_type: 'publish',
    last_rejection_reason: null,
    published_fields: null,
    ...overrides,
  };
}

export function makeRequest(overrides: Partial<OwnSpeciesRequestDto> = {}): OwnSpeciesRequestDto {
  return {
    id: 1,
    species_id: 1,
    common_name: 'Jaguar',
    request_type: 'publish',
    status: 'submitted',
    created_at: '2026-11-10T15:00:00Z',
    reviewed_at: null,
    rejection_reason: null,
    species_publication_status: 'pending',
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function apiError(status: number, errors?: Record<string, string[]>) {
  return Object.assign(new Error('error'), { status, errors });
}
