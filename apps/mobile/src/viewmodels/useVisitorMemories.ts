import { useCallback, useEffect, useState } from 'react';
import type { VisitorMemoryDto, VisitorMemoryList } from '@arca/api-client';
import { peekMemories, rememberMemories, subscribeMemories } from '../memories/memoryStore';
import { presentMemoryError } from '../memories/presentError';
import { memoryRepository, type MemoryRepository } from '../repositories/memoryRepository';

export function useVisitorMemories(repository: MemoryRepository | null = memoryRepository) {
  const [list, setList] = useState<VisitorMemoryList | null>(() => peekMemories());
  const [loading, setLoading] = useState(() => peekMemories() === null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!repository) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await repository.list();
      rememberMemories(next);
      setList(next);
    } catch (cause) {
      setError(presentMemoryError(cause).message);
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeMemories(() => setList(peekMemories())), []);

  return { list, loading, error, reload: load, available: repository !== null };
}

export function findMemory(id: number, list: VisitorMemoryList | null = peekMemories()): VisitorMemoryDto | null {
  return list?.data.find((item) => item.id === id) ?? null;
}
