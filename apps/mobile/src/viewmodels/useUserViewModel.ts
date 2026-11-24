import { useState, useEffect, useCallback } from 'react';
import { UserRepository, UserRepositoryImpl } from '../repositories';
import { isMockDataEnabled } from '../config/runtime';
import { Achievement, Milestone, User, Mission } from '../models';
import {
  profileDiscoveryCounts,
  progressRepository,
  type ProgressRepository,
  type ProgressSnapshot,
} from '../repositories/progressRepository';
import type { VisitorProfile } from '../repositories/authRepository';
import { accountSession, type AccountSessionStatus } from '../session/accountSession';
import { useVisitorProfile } from './useVisitorProfile';
import { useVisitorProgress } from './useVisitorProgress';

export type UserDataStatus = 'loading' | 'guest' | 'error' | 'ready';

export const MISSING_PROGRESS_SOURCE_MESSAGE = 'No se pudo conectar con el zoológico. Intenta de nuevo más tarde.';
export const PROGRESS_ERROR_MESSAGE = 'No se pudo cargar tu progreso. Revisa tu conexión e intenta de nuevo.';
export const FALLBACK_VISITOR_NAME = 'Visitante';

const mockRepository = new UserRepositoryImpl();

/** Deriva el usuario de los datos reales del visitante (nunca de mocks). */
export function buildVisitorUser(profile: VisitorProfile | null, snapshot: ProgressSnapshot): User {
  const counts = profileDiscoveryCounts(snapshot);
  return {
    id: profile?.email ?? 'visitor',
    name: profile?.nickname?.trim() || profile?.firstName?.trim() || FALLBACK_VISITOR_NAME,
    avatar: profile?.avatarCode ?? '',
    level: snapshot.progress.level,
    rank: snapshot.progress.rank,
    points: snapshot.progress.points,
    discoveredCount: counts?.discovered ?? snapshot.progress.discoveredSpecies,
    totalAnimals: counts?.total ?? snapshot.progress.totalSpecies,
  };
}

/** Hitos reales: los logros ya obtenidos y su fecha. Sin endpoint propio, no se inventa nada. */
export function milestonesFromAchievements(achievements: Achievement[]): Milestone[] {
  return achievements
    .filter((item) => item.unlocked && item.earnedAt)
    .map((item) => ({ id: item.id, title: item.title, date: item.earnedAt as string }));
}

function useMockUserData(repository: UserRepository | null) {
  const [user, setUser] = useState<User | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(repository !== null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!repository) return;
    setLoading(true);
    setError(null);
    try {
      const [userData, missionsData, achievementData, milestoneData] = await Promise.all([
        repository.getUser(),
        repository.getMissions(),
        repository.getAchievements(),
        repository.getMilestones(),
      ]);
      setUser(userData);
      setMissions(missionsData);
      setAchievements(achievementData);
      setMilestones(milestoneData);
    } catch (cause) {
      console.error('Error loading user data:', cause);
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los datos del perfil.');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  return { user, missions, achievements, milestones, loading, error, refresh: load };
}

function useSessionStatus(): AccountSessionStatus {
  const [status, setStatus] = useState<AccountSessionStatus>(accountSession.getStatus());
  useEffect(() => accountSession.subscribe(() => setStatus(accountSession.getStatus())), []);
  return status;
}

/**
 * ViewModel de los datos del visitante (inicio, perfil, juego, logros, colección).
 * - Con `repository` o con mocks habilitados (CA-08) usa datos de demostración.
 * - En cualquier otro caso lee la API real (CA-03), con estados `guest` (CA-04) y `error` (CA-05).
 * `progressSource` permite inyectar el repositorio de progreso en pruebas.
 */
export function useUserViewModel(repository?: UserRepository, progressSource?: ProgressRepository | null) {
  const injectedLive = progressSource !== undefined;
  const mockSource: UserRepository | null = repository ?? (!injectedLive && isMockDataEnabled() ? mockRepository : null);
  const liveSource: ProgressRepository | null = mockSource ? null : (injectedLive ? progressSource : progressRepository);

  const mock = useMockUserData(mockSource);
  const progress = useVisitorProgress(liveSource);
  const { profile } = useVisitorProfile();
  const sessionStatus = useSessionStatus();

  if (mockSource) {
    return {
      status: (mock.loading ? 'loading' : mock.error ? 'error' : 'ready') as UserDataStatus,
      user: mock.user,
      missions: mock.missions,
      achievements: mock.achievements,
      milestones: mock.milestones,
      loading: mock.loading,
      error: mock.error,
      refresh: mock.refresh,
    };
  }

  const snapshot = progress.snapshot;
  let status: UserDataStatus;
  let error: string | null = null;
  if (sessionStatus === 'guest') {
    status = 'guest';
  } else if (snapshot) {
    status = 'ready';
  } else if (sessionStatus === 'bootstrapping' || progress.loading) {
    status = 'loading';
  } else if (progress.error) {
    status = 'error';
    error = PROGRESS_ERROR_MESSAGE;
  } else {
    status = 'error';
    error = liveSource ? PROGRESS_ERROR_MESSAGE : MISSING_PROGRESS_SOURCE_MESSAGE;
  }

  return {
    status,
    user: snapshot ? buildVisitorUser(profile, snapshot) : null,
    missions: snapshot?.missions ?? [],
    achievements: snapshot?.achievements ?? [],
    milestones: snapshot ? milestonesFromAchievements(snapshot.achievements) : [],
    loading: status === 'loading',
    error,
    refresh: progress.refresh,
  };
}
