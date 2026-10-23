import { useCallback, useEffect, useState } from 'react';
import {
  applySpeciesDiscovery,
  progressRepository,
  type ProgressRepository,
  type ProgressSnapshot,
} from '../repositories/progressRepository';
import {
  peekSharedProgress,
  readSharedProgress,
  sharedProgressGeneration,
} from '../repositories/sharedProgress';
import { Animal } from '../models';
import { accountSession } from '../session/accountSession';

export function useVisitorProgress(repository: ProgressRepository | null = progressRepository) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(
    repository ? peekSharedProgress(repository) : null,
  );
  const [loading, setLoading] = useState(() => {
    if (!repository || accountSession.getStatus() === 'guest') return false;
    return peekSharedProgress(repository) === null;
  });
  const [error, setError] = useState<string | null>(null);

  const loadShared = useCallback(async (force: boolean) => {
    if (!repository) {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }
    const status = accountSession.getStatus();
    if (status === 'guest') {
      setSnapshot(null);
      setLoading(false);
      setError(null);
      return;
    }
    if (status !== 'authenticated') {
      setLoading(true);
      return;
    }
    if (!force) {
      const cached = peekSharedProgress(repository);
      if (cached) {
        setSnapshot(cached);
        setError(null);
        setLoading(false);
        return;
      }
    }

    const generationAtStart = sharedProgressGeneration();
    if (!peekSharedProgress(repository)) setLoading(true);
    setError(null);
    try {
      const next = await readSharedProgress(repository, force);
      if (generationAtStart !== sharedProgressGeneration()) return;
      if (accountSession.getStatus() !== 'authenticated') return;
      setSnapshot(next);
      setError(null);
    } catch (cause) {
      if (generationAtStart !== sharedProgressGeneration()) return;
      if (accountSession.getStatus() !== 'authenticated') return;
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar el progreso.');
    } finally {
      if (generationAtStart !== sharedProgressGeneration()) return;
      if (accountSession.getStatus() === 'authenticated') setLoading(false);
    }
  }, [repository]);

  const refresh = useCallback(() => loadShared(true), [loadShared]);

  useEffect(() => {
    void loadShared(false);
    return accountSession.subscribe(() => {
      void loadShared(false);
    });
  }, [loadShared]);

  return { snapshot, loading, error, refresh };
}

export function mergeDiscoveredSpecies(animals: Animal[], snapshot: ProgressSnapshot | null): Animal[] {
  if (!snapshot) return animals;
  return applySpeciesDiscovery(animals, snapshot.collection);
}
