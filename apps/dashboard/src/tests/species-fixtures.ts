import { vi } from "vitest";
import type {
  AdminApi,
  SpeciesRequestDetailDto,
  SpeciesRequestSummaryDto,
} from "../viewmodels/admin-types";
import {
  initialSpeciesRequestsState,
  speciesRequestsReducer,
  type RequestsContext,
  type SpeciesRequestsAction,
  type SpeciesRequestsState,
} from "../viewmodels/species-requests";

export function summary(overrides: Partial<SpeciesRequestSummaryDto> = {}): SpeciesRequestSummaryDto {
  return {
    id: 7,
    species_id: 3,
    common_name: "León africano",
    scientific_name: "Panthera leo",
    category: "mammal",
    request_type: "publish",
    status: "submitted",
    publication_status: "not_published",
    created_at: "2026-11-10T15:30:00Z",
    veterinarian_name: "Ana Pérez",
    ...overrides,
  };
}

export function requestDetail(
  overrides: Partial<SpeciesRequestDetailDto> = {},
  current: Partial<SpeciesRequestDetailDto["current"]> = {},
  proposed: Partial<SpeciesRequestDetailDto["proposed"]> = {},
): SpeciesRequestDetailDto {
  return {
    id: 7,
    species_id: 3,
    status: "submitted",
    request_type: "publish",
    created_at: "2026-11-10T15:30:00Z",
    veterinarian_name: "Ana Pérez",
    rejection_reason: null,
    published_fields: ["scientific_name", "origin", "habitat"],
    current: {
      common_name: "León africano",
      scientific_name: "Panthera leo",
      habitat: "Sabana",
      origin: "África",
      category: "mammal",
      is_published: false,
      published_at: null,
      publication_status: "not_published",
      has_image: false,
      ...current,
    },
    proposed: {
      scientific_name: "Panthera leo",
      habitat: "Sabana abierta",
      origin: "África subsahariana",
      category: "mammal",
      published_fields: ["scientific_name", "origin", "habitat"],
      has_new_photo: true,
      ...proposed,
    },
    ...overrides,
  };
}

export function apiError(status: number, message: string, errors?: Record<string, string[]>) {
  return Object.assign(new Error(message), { name: "ApiError", status, errors });
}

export function blobFile(name = "foto.png") {
  return { blob: new Blob(["x"], { type: "image/png" }), filename: name };
}

/** Cliente simulado con las rutas de api-014 que usan los ViewModels. */
export function fakeApi(overrides: Record<string, unknown> = {}) {
  const requests = {
    list: vi.fn(async () => ({ data: [summary()], meta: { has_more: false } })),
    get: vi.fn(async () => requestDetail()),
    update: vi.fn(async (_id: number, _input: unknown) => requestDetail()),
    accept: vi.fn(async (_id: number, _input: unknown) => ({})),
    reject: vi.fn(async (_id: number, _input: unknown) =>
      requestDetail({ status: "rejected", rejection_reason: "Motivo" }),
    ),
    image: vi.fn(async () => blobFile()),
    ...(overrides.requests as object | undefined),
  };
  const species = {
    image: vi.fn(async () => blobFile("publicada.png")),
    ...(overrides.species as object | undefined),
  };

  return {
    api: { speciesPublicationRequests: requests, publishedSpecies: species } as unknown as AdminApi,
    requests,
    species,
  };
}

/** Estado, dispatch y vista previa de prueba para las funciones del ViewModel. */
export function harness(api: AdminApi, initial: SpeciesRequestsState = initialSpeciesRequestsState) {
  let state = initial;
  let counter = 0;
  const created: string[] = [];
  const revoked: string[] = [];
  const actions: SpeciesRequestsAction[] = [];
  const ctx: RequestsContext = {
    api,
    dispatch: (action) => {
      actions.push(action);
      state = speciesRequestsReducer(state, action);
    },
    preview: {
      create: () => {
        const url = `blob:test/${++counter}`;
        created.push(url);

        return url;
      },
      revoke: (url) => void revoked.push(url),
    },
    getState: () => state,
    isCurrent: () => true,
  };

  return { ctx, get state() { return state; }, created, revoked, actions };
}

import type { SpeciesRequestsViewModel } from "../viewmodels/species-requests";
import { requestIsDirty } from "../viewmodels/species-requests";

/** ViewModel de prueba: estado real y acciones simuladas, para marcado estático. */
export function viewModelFor(
  state: SpeciesRequestsState,
  actionSpies: Partial<SpeciesRequestsViewModel["actions"]> = {},
): SpeciesRequestsViewModel {
  const noop = () => undefined;

  return {
    state,
    dirty: requestIsDirty(state),
    actions: {
      changeFilter: noop,
      goToPage: noop,
      reload: noop,
      open: noop,
      close: noop,
      reloadDetail: noop,
      startEdit: noop,
      cancelEdit: noop,
      changeDraft: noop,
      toggleField: noop,
      choosePhoto: noop,
      clearPhoto: noop,
      save: noop,
      openDecision: noop,
      closeDecision: noop,
      changeRejectReason: noop,
      confirmDecision: noop,
      dismissNotice: noop,
      ...actionSpies,
    },
  };
}

export function stateWith(patch: Partial<SpeciesRequestsState>): SpeciesRequestsState {
  return { ...initialSpeciesRequestsState, ...patch };
}
