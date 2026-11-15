import { vi } from "vitest";
import type {
  AdminApi,
  MemoryReviewDetailDto,
  MemoryReviewSummaryDto,
} from "../viewmodels/admin-types";
import {
  initialMemoryDetailState,
  initialMemoryListState,
  memoryDetailReducer,
  memoryListReducer,
  type MemoryDetailAction,
  type MemoryDetailContext,
  type MemoryDetailState,
  type MemoryDetailViewModel,
  type MemoryListAction,
  type MemoryListContext,
  type MemoryListState,
  type MemoryListViewModel,
} from "../viewmodels/memory-review";

export function summary(overrides: Partial<MemoryReviewSummaryDto> = {}): MemoryReviewSummaryDto {
  return {
    id: 11,
    status: "submitted",
    opinion: "Mi primer viaje al zoológico fue inolvidable.",
    created_at: "2026-11-10T15:30:00Z",
    resubmitted_count: 0,
    ...overrides,
  };
}

export function detail(overrides: Partial<MemoryReviewDetailDto> = {}): MemoryReviewDetailDto {
  return {
    id: 11,
    status: "in_review",
    opinion: "Mi primer viaje al zoológico fue inolvidable.",
    created_at: "2026-11-10T15:30:00Z",
    resubmitted_count: 0,
    rejection_reason: null,
    rejected_fields: [],
    reviewed_at: null,
    published_at: null,
    published_until: null,
    is_published: false,
    publication_days: 7,
    ...overrides,
  };
}

export function apiError(status: number, message: string, errors?: Record<string, string[]>) {
  return Object.assign(new Error(message), { name: "ApiError", status, errors });
}

export function imageFile(type = "image/png") {
  return { blob: new Blob(["x"], { type }), filename: "foto.png" };
}

/** Cliente simulado de `memoryReview` (contrato de api-010 sin implementar). */
export function fakeApi(overrides: Record<string, unknown> = {}) {
  const review = {
    list: vi.fn(async (_query?: unknown) => ({ data: [summary()], meta: { has_more: false } })),
    get: vi.fn(async (_id: number) => detail()),
    image: vi.fn(async (_id: number) => imageFile()),
    accept: vi.fn(async (_id: number) => undefined),
    reject: vi.fn(async (_id: number, _input: unknown) => undefined),
    ...overrides,
  };

  return { api: { memoryReview: review } as unknown as AdminApi, review };
}

export function previewSpy() {
  let counter = 0;
  const created: string[] = [];
  const revoked: string[] = [];

  return {
    created,
    revoked,
    preview: {
      create: () => {
        const url = `blob:test/${++counter}`;
        created.push(url);

        return url;
      },
      revoke: (url: string) => void revoked.push(url),
    },
  };
}

/** Estado, dispatch y vista previa de prueba para el detalle. */
export function detailHarness(api: AdminApi, initial: MemoryDetailState = initialMemoryDetailState) {
  let state = initial;
  const spy = previewSpy();
  const actions: MemoryDetailAction[] = [];
  let current = true;
  const ctx: MemoryDetailContext = {
    api,
    dispatch: (action) => {
      actions.push(action);
      state = memoryDetailReducer(state, action);
    },
    preview: spy.preview,
    getState: () => state,
    isCurrent: () => current,
  };

  return {
    ctx,
    get state() {
      return state;
    },
    created: spy.created,
    revoked: spy.revoked,
    actions,
    supersede: () => {
      current = false;
    },
  };
}

export function listHarness(api: AdminApi, initial: MemoryListState = initialMemoryListState) {
  let state = initial;
  const actions: MemoryListAction[] = [];
  const ctx: MemoryListContext = {
    api,
    dispatch: (action) => {
      actions.push(action);
      state = memoryListReducer(state, action);
    },
    isCurrent: () => true,
  };

  return {
    ctx,
    get state() {
      return state;
    },
    actions,
  };
}

export function detailStateWith(patch: Partial<MemoryDetailState>): MemoryDetailState {
  return { ...initialMemoryDetailState, status: "ready", data: detail(), ...patch };
}

export function listStateWith(patch: Partial<MemoryListState>): MemoryListState {
  return { ...initialMemoryListState, ...patch };
}

export function detailViewModel(
  state: MemoryDetailState,
  spies: Partial<MemoryDetailViewModel["actions"]> = {},
): MemoryDetailViewModel {
  const noop = () => undefined;

  return {
    state,
    actions: {
      reload: noop,
      openAccept: noop,
      openReject: noop,
      closeDecision: noop,
      changeRejectReason: noop,
      toggleRejectField: noop,
      confirmDecision: noop,
      dismissNotice: noop,
      dismissAlert: noop,
      ...spies,
    },
  };
}

export function listViewModel(
  state: MemoryListState,
  spies: Partial<MemoryListViewModel["actions"]> = {},
): MemoryListViewModel {
  const noop = () => undefined;

  return { state, actions: { changeFilter: noop, goToPage: noop, reload: noop, ...spies } };
}
