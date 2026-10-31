import { useCallback, useEffect, useState } from 'react';
import { listAnimals, type AnimalSummary } from '@/services/apiClient';

export function formToRecord(form: HTMLFormElement): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of new FormData(form).entries()) {
    if (typeof value === 'string') record[key] = value;
  }
  return record;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function useSaveRequest() {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');

  const run = useCallback(async (action: () => Promise<void>, successMessage: string) => {
    setStatus('saving');
    setMessage('');
    try {
      await action();
      setStatus('saved');
      setMessage(successMessage);
      return true;
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'No se pudo guardar.');
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
  }, []);

  return { status, message, run, reset, saving: status === 'saving' };
}

export function useAnimals(search = '') {
  const [animals, setAnimals] = useState<AnimalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      listAnimals(search)
        .then((result) => {
          if (cancelled) return;
          setAnimals(result);
          setError('');
        })
        .catch((reason: unknown) => {
          if (cancelled) return;
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar la lista.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { animals, loading, error, reload };
}
