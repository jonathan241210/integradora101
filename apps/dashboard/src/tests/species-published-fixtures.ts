import { vi } from "vitest";
import type {
  AdminApi,
  PublishedSpeciesRowDto,
  SpeciesPublicationDetailDto,
} from "../viewmodels/admin-types";
import {
  initialPublishedSpeciesState,
  publishedIsDirty,
  publishedSpeciesReducer,
  type PublishedContext,
  type PublishedSpeciesAction,
  type PublishedSpeciesState,
  type PublishedSpeciesViewModel,
} from "../viewmodels/published-species";
import { blobFile } from "./species-fixtures";

export function row(overrides: Partial<PublishedSpeciesRowDto> = {}): PublishedSpeciesRowDto {
  return {
    id: 3,
    common_name: "León africano",
    scientific_name: "Panthera leo",
    category: "mammal",
    status: "published",
    published_at: "2026-11-10T15:30:00Z",
    unpublished_at: null,
    has_image: true,
    has_pending_request: false,
    ...overrides,
  };
}

export function publication(
  overrides: Partial<SpeciesPublicationDetailDto> = {},
): SpeciesPublicationDetailDto {
  return {
    id: 3,
    common_name: "León africano",
    scientific_name: "Panthera leo",
    habitat: "Sabana",
    origin: "África",
    category: "mammal",
    publication_status: "published",
    is_published: true,
    published_at: "2026-11-10T15:30:00Z",
    unpublished_at: null,
    published_fields: ["scientific_name", "origin", "habitat"],
    has_image: true,
    has_pending_request: false,
    ...overrides,
  };
}

/** Especie despublicada: la API la entrega con `is_published` falso y `unpublished_at`. */
export const unpublishedSpecies = (overrides: Partial<SpeciesPublicationDetailDto> = {}) =>
  publication({
    publication_status: "unpublished",
    is_published: false,
    unpublished_at: "2026-11-11T10:00:00Z",
    ...overrides,
  });

/** Con solicitud pendiente la API informa `publication_status = pending` (RN-18). */
export const pendingSpecies = (overrides: Partial<SpeciesPublicationDetailDto> = {}) =>
  publication({ publication_status: "pending", has_pending_request: true, ...overrides });

export function fakePublishedApi(overrides: Record<string, unknown> = {}) {
  const species = {
    list: vi.fn(async (_query?: unknown) => ({ data: [row()], meta: { has_more: false } })),
    get: vi.fn(async (_id: number) => publication()),
    update: vi.fn(async (_id: number, _input: unknown) => unpublishedSpecies()),
    unpublish: vi.fn(async (_id: number) => unpublishedSpecies()),
    republish: vi.fn(async (_id: number) => publication()),
    removePublication: vi.fn(async (_id: number) =>
      publication({ publication_status: "not_published", is_published: false, has_image: false }),
    ),
    image: vi.fn(async (_id: number) => blobFile("publicada.png")),
    ...overrides,
  };

  return { api: { publishedSpecies: species } as unknown as AdminApi, species };
}

export function publishedHarness(
  api: AdminApi,
  initial: PublishedSpeciesState = initialPublishedSpeciesState,
) {
  let state = initial;
  let counter = 0;
  const created: string[] = [];
  const revoked: string[] = [];
  const actions: PublishedSpeciesAction[] = [];
  const refreshList = vi.fn();
  const ctx: PublishedContext = {
    api,
    dispatch: (action) => {
      actions.push(action);
      state = publishedSpeciesReducer(state, action);
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
    refreshList,
  };

  return { ctx, get state() { return state; }, created, revoked, actions, refreshList };
}

export function publishedViewModel(
  state: PublishedSpeciesState,
  spies: Partial<PublishedSpeciesViewModel["actions"]> = {},
): PublishedSpeciesViewModel {
  const noop = () => undefined;

  return {
    state,
    dirty: publishedIsDirty(state),
    actions: {
      changeStatus: noop,
      changeCategory: noop,
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
      openAction: noop,
      closeAction: noop,
      confirmAction: noop,
      dismissNotice: noop,
      ...spies,
    },
  };
}

export const publishedStateWith = (patch: Partial<PublishedSpeciesState>): PublishedSpeciesState => ({
  ...initialPublishedSpeciesState,
  ...patch,
});
