import {
  createVisitorApi,
  type ApiError,
  type VisitorMemoryDto,
  type VisitorMemoryList,
  type VisitorMemorySubmit,
} from '@arca/api-client';
import { File } from 'expo-file-system';
import { createSecureTokenStorage, tokenStorage, type TokenStorage } from '../services/tokenStorage';
import type { MemoryFile } from '../memories/pickMemoryImage';

export type MemorySubmitInput = {
  image?: MemoryFile | null;
  opinion?: string | null;
  consent: boolean;
};

export interface MemoryRepository {
  list(): Promise<VisitorMemoryList>;
  submit(input: MemorySubmitInput): Promise<VisitorMemoryDto>;
  resubmit(id: number, input: MemorySubmitInput): Promise<VisitorMemoryDto>;
}

function toSubmit(input: MemorySubmitInput): VisitorMemorySubmit {
  return {
    image: input.image ? new File(input.image.uri) : null,
    opinion: input.opinion,
    consent: input.consent,
  };
}

export function createMemoryRepository(options: {
  baseUrl: string;
  storage?: TokenStorage;
  fetchImpl?: typeof fetch;
}): MemoryRepository {
  const storage = options.storage ?? tokenStorage;
  const api = createVisitorApi({
    baseUrl: options.baseUrl,
    fetchImpl: options.fetchImpl,
    getAccessToken: async () => (await storage.read())?.accessToken ?? null,
    getRefreshToken: async () => (await storage.read())?.refreshToken ?? null,
    onTokens: async (next) => {
      const current = await storage.read();
      await storage.write({
        accessToken: next.accessToken,
        refreshToken: next.refreshToken ?? current?.refreshToken ?? '',
      });
    },
    onSessionExpired: async (accessToken) => {
      await storage.clearIfCurrent(accessToken);
    },
  });

  return {
    list: () => api.listVisitorMemories(),
    submit: (input) => api.submitVisitorMemory(toSubmit(input)),
    resubmit: (id, input) => api.resubmitVisitorMemory(id, toSubmit(input)),
  };
}

export function isMemoryApiError(error: unknown): error is ApiError {
  return error instanceof Error && error.name === 'ApiError';
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const memoryRepository: MemoryRepository | null =
  configuredApiUrl && process.env.JEST_WORKER_ID === undefined
    ? createMemoryRepository({
        baseUrl: configuredApiUrl,
        storage: createSecureTokenStorage(),
      })
    : null;
