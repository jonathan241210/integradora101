import type { SelectableSpeciesDto } from '@arca/api-client';
import { useCallback, useEffect, useState } from 'react';
import { veterinarianApi } from '@/services/veterinarianApi';

export type SelectorStatus = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden';
export type SelectorState = { status: SelectorStatus; species: SelectableSpeciesDto[] };

export const loadingSelector: SelectorState = { status: 'loading', species: [] };

export async function loadSpecies(api: {
  species: { list(): Promise<SelectableSpeciesDto[]> };
}): Promise<SelectorState> {
  try {
    const species = await api.species.list();
    return { status: species.length === 0 ? 'empty' : 'ready', species };
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
    // El 401 ya lo atiende el cliente HTTP (vuelta a inicio de sesión).
    return { status: status === 403 ? 'forbidden' : 'error', species: [] };
  }
}

export function useSpeciesSelector() {
  const [state, setState] = useState<SelectorState>(loadingSelector);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState(loadingSelector);
    void loadSpecies(veterinarianApi).then((result) => {
      if (active) setState(result);
    });
    return () => { active = false; };
  }, [version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { ...state, reload };
}
