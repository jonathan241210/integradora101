import type { HasMorePage, OwnSpeciesRequestDto } from '@arca/api-client';
import { useCallback, useEffect, useState } from 'react';
import { veterinarianApi } from '@/services/veterinarianApi';

export type OwnRequestsStatus = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden';
export type OwnRequestsState = {
  status: OwnRequestsStatus;
  requests: OwnSpeciesRequestDto[];
  hasMore: boolean;
};

export const loadingRequests: OwnRequestsState = { status: 'loading', requests: [], hasMore: false };

export async function loadOwnRequests(
  api: { publicationRequests: { list(page?: number): Promise<HasMorePage<OwnSpeciesRequestDto>> } },
  page: number,
): Promise<OwnRequestsState> {
  try {
    const result = await api.publicationRequests.list(page);
    return {
      status: result.data.length === 0 ? 'empty' : 'ready',
      requests: result.data,
      hasMore: result.meta.has_more,
    };
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
    // En error no se conservan datos anteriores como actuales (CA-17).
    return { status: status === 403 ? 'forbidden' : 'error', requests: [], hasMore: false };
  }
}

export function useOwnSpeciesRequests() {
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<OwnRequestsState>(loadingRequests);

  useEffect(() => {
    let active = true;
    setState(loadingRequests);
    void loadOwnRequests(veterinarianApi, page).then((result) => {
      if (active) setState(result);
    });
    return () => { active = false; };
  }, [page, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const next = useCallback(() => setPage((current) => current + 1), []);
  const previous = useCallback(() => setPage((current) => Math.max(1, current - 1)), []);

  return { ...state, page, reload, next, previous };
}
