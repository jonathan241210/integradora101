import { useCallback, useEffect, useState } from 'react';
import {
  getAnimal,
  listAnimals,
  listEnclosures,
  listSpecies,
  type AnimalProfile,
  type AnimalSummary,
  type EnclosureOption,
  type SpeciesOption,
} from '@/services/apiClient';
import { getCachedAnimalProfile, getCachedAnimals, getCachedEnclosures, getCachedSpecies } from '@/offline/bootstrap';
import { isOnline, toUserSyncMessage } from '@/offline/utils';

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

  const run = useCallback(
    async (action: () => Promise<unknown>, successMessage: string | ((result: unknown) => string)) => {
      setStatus('saving');
      setMessage('');
      try {
        const result = await action();
        setStatus('saved');
        setMessage(typeof successMessage === 'function' ? successMessage(result) : successMessage);
        return true;
      } catch (error) {
        setStatus('error');
        setMessage(toUserSyncMessage(error, 'No se pudo guardar.'));
        return false;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setMessage('');
  }, []);

  return { status, message, run, reset, saving: status === 'saving' };
}

export function useAnimal(id: number | null, userScope?: string) {
  const [animal, setAnimal] = useState<AnimalProfile | null>(null);
  const [loading, setLoading] = useState(id !== null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (id === null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (!isOnline() && userScope) {
          const cached = await getCachedAnimalProfile(userScope, id);
          if (cached) {
            if (!cancelled) {
              setAnimal(cached as AnimalProfile);
              setError('');
            }
            return;
          }
        }
        const result = await getAnimal(id);
        if (cancelled) return;
        setAnimal(result);
        setError('');
      } catch (reason: unknown) {
        if (cancelled) return;
        if (userScope) {
          const cached = await getCachedAnimalProfile(userScope, id);
          if (cached) {
            setAnimal(cached as AnimalProfile);
            setError('Mostrando información en caché (sin conexión).');
            return;
          }
        }
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el perfil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, version, userScope]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { animal, loading, error, reload };
}

export function useAnimals(search = '', userScope?: string) {
  const [animals, setAnimals] = useState<AnimalSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        if (!isOnline() && userScope) {
          const cached = await getCachedAnimals(userScope, search);
          if (!cancelled) {
            setAnimals(cached);
            setError(cached.length === 0 ? 'Sin conexión y sin catálogo local disponible. Conéctate y sincroniza para ver animales.' : '');
          }
          return;
        }
        const result = await listAnimals(search);
        if (cancelled) return;
        setAnimals(result);
        setError('');
      } catch (reason: unknown) {
        if (cancelled) return;
        if (userScope) {
          const cached = await getCachedAnimals(userScope, search);
          setAnimals(cached);
          setError(cached.length === 0 ? (reason instanceof Error ? reason.message : 'No se pudo cargar la lista.') : '');
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar la lista.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, version, userScope]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { animals, loading, error, reload };
}

export function useEnclosures(userScope?: string) {
  const [enclosures, setEnclosures] = useState<EnclosureOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (!isOnline() && userScope) {
          const cached = await getCachedEnclosures(userScope);
          if (!cancelled) {
            setEnclosures(cached);
            setError(cached.length === 0 ? 'Sin conexión y sin recintos en caché. Conéctate y sincroniza los catálogos para continuar.' : '');
          }
          return;
        }
        const result = await listEnclosures();
        if (cancelled) return;
        setEnclosures(result);
        setError('');
      } catch (reason: unknown) {
        if (cancelled) return;
        if (userScope) {
          const cached = await getCachedEnclosures(userScope);
          setEnclosures(cached);
          setError(cached.length === 0 ? (reason instanceof Error ? reason.message : 'No se pudieron cargar los recintos. Sincroniza los catálogos cuando haya conexión.') : '');
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se pudieron cargar los recintos.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version, userScope]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { enclosures, loading, error, reload };
}

export function useSpeciesOptions(userScope?: string) {
  const [species, setSpecies] = useState<SpeciesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (!isOnline() && userScope) {
          const cached = await getCachedSpecies(userScope);
          if (!cancelled) {
            setSpecies(cached);
            setError(cached.length === 0 ? 'Sin conexión y sin especies en caché. Conéctate y sincroniza los catálogos para continuar.' : '');
          }
          return;
        }
        const result = await listSpecies();
        if (cancelled) return;
        setSpecies(result);
        setError('');
      } catch (reason: unknown) {
        if (cancelled) return;
        if (userScope) {
          const cached = await getCachedSpecies(userScope);
          setSpecies(cached);
          setError(cached.length === 0 ? (reason instanceof Error ? reason.message : 'No se pudieron cargar las especies. Sincroniza los catálogos cuando haya conexión.') : '');
          return;
        }
        setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las especies.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [version, userScope]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { species, loading, error, reload };
}
