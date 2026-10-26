import {
  createVisitorApi,
  type ApiError,
  type VisitorCatalogItemDto,
  type VisitorDiscoveryDto,
  type VisitorProgressDto,
  type VisitorSpeciesDto,
} from '@arca/api-client';
import { Achievement, Animal, Mission } from '../models';
import { createSecureTokenStorage, tokenStorage, type TokenStorage } from '../services/tokenStorage';

export type VisitorProgress = {
  points: number;
  level: number;
  rank: string;
  nextThreshold: number | null;
  discoveredSpecies: number;
  totalSpecies: number;
};

export type SpeciesDiscovery = {
  id: number;
  commonName: string;
  category: string | null;
  discovered: boolean;
  discoveredAt: string | null;
};

export type ProgressSnapshot = {
  progress: VisitorProgress;
  collection: SpeciesDiscovery[];
  achievements: Achievement[];
  missions: Mission[];
};

export type DiscoveryOutcome = {
  result: VisitorDiscoveryDto['result'];
  message: string;
  pointsAwarded: number;
  newSpecies: string[];
  progress: VisitorProgress;
};

export interface ProgressRepository {
  load(): Promise<ProgressSnapshot>;
  discover(input: { code: string; scannedAt: string; clientScanId: string }): Promise<DiscoveryOutcome>;
}

const RESULT_MESSAGES: Record<VisitorDiscoveryDto['result'], string> = {
  discovered: 'Descubriste especies nuevas.',
  already_discovered: 'Esas especies ya estaban en tu colección.',
  invalid_code: 'Ese código no corresponde a un recinto.',
  inactive_code: 'Ese código ya no está activo.',
  expired_scan: 'El escaneo venció. Vuelve a leer el código.',
};

export function mapProgress(dto: VisitorProgressDto): VisitorProgress {
  return {
    points: dto.points,
    level: dto.level,
    rank: dto.rank,
    nextThreshold: dto.next_threshold,
    discoveredSpecies: dto.discovered_species,
    totalSpecies: dto.total_species,
  };
}

export function mapSpecies(dto: VisitorSpeciesDto): SpeciesDiscovery {
  return {
    id: dto.id,
    commonName: dto.common_name,
    category: dto.category,
    discovered: dto.discovered,
    discoveredAt: dto.discovered_at,
  };
}

export function mapAchievement(dto: VisitorCatalogItemDto): Achievement {
  return {
    id: dto.code,
    title: dto.title,
    description: dto.description,
    icon: dto.icon,
    points: dto.points,
    action: '',
    requirement: `${dto.progress} de ${dto.rule_target}`,
    unlocked: dto.state !== 'pending',
    earnedAt: dto.earned_at ?? undefined,
  };
}

export function mapMission(dto: VisitorCatalogItemDto): Mission {
  return {
    id: dto.code,
    title: dto.title,
    objective: dto.objective ?? dto.description,
    progress: dto.progress,
    total: dto.rule_target,
    reward: `${dto.points} puntos`,
  };
}

export function applySpeciesDiscovery(animals: Animal[], collection: SpeciesDiscovery[]): Animal[] {
  return animals.map((animal) => {
    const species = collection.find((item) => item.commonName === animal.commonName);
    if (!species) return { ...animal, isDiscovered: false, discoveredAt: null };
    return { ...animal, isDiscovered: species.discovered, discoveredAt: species.discoveredAt };
  });
}

function outcomeFrom(dto: VisitorDiscoveryDto): DiscoveryOutcome {
  return {
    result: dto.result,
    message: dto.message ?? RESULT_MESSAGES[dto.result],
    pointsAwarded: dto.points_awarded,
    newSpecies: dto.new_species.map((species) => species.common_name),
    progress: mapProgress(dto.progress),
  };
}

export function createHttpProgressRepository(options: {
  baseUrl: string;
  storage?: TokenStorage;
  fetchImpl?: typeof fetch;
}): ProgressRepository {
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
    onSessionExpired: async () => {
      await storage.clear();
    },
  });

  return {
    async load() {
      const [progress, collection, achievements, missions] = await Promise.all([
        api.progress(),
        api.collection(),
        api.achievements(),
        api.missions(),
      ]);
      return {
        progress: mapProgress(progress),
        collection: collection.map(mapSpecies),
        achievements: achievements.map(mapAchievement),
        missions: missions.map(mapMission),
      };
    },
    async discover(input) {
      const dto = await api.discoveries({
        code: input.code,
        scanned_at: input.scannedAt,
        client_scan_id: input.clientScanId,
      });
      return outcomeFrom(dto);
    },
  };
}

export function isOfflineError(error: unknown): boolean {
  return error instanceof Error && 'status' in error && (error as ApiError).status === 0;
}

export function isRateLimitError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error && (error as ApiError).status === 429;
}

const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export const progressRepository: ProgressRepository | null =
  configuredApiUrl && process.env.JEST_WORKER_ID === undefined
    ? createHttpProgressRepository({
        baseUrl: configuredApiUrl,
        storage: createSecureTokenStorage(),
      })
    : null;
