import type { OwnSpeciesRequestDto, TotalPage } from '@arca/api-client';
import { useCallback, useEffect, useState } from 'react';
import { veterinarianApi } from '@/services/veterinarianApi';

export type OwnRequestsStatus = 'loading' | 'ready' | 'empty' | 'error' | 'forbidden';
export type OwnRequestsState = {
  status: OwnRequestsStatus;
  requests: OwnSpeciesRequestDto[];
  hasMore: boolean;
  lastPage: number;
  total: number;
};

export const loadingRequests: OwnRequestsState = {
  status: 'loading',
  requests: [],
  hasMore: false,
  lastPage: 1,
  total: 0,
};

export async function loadOwnRequests(
  api: { publicationRequests: { list(page?: number): Promise<TotalPage<OwnSpeciesRequestDto>> } },
  page: number,
): Promise<OwnRequestsState> {
  try {
    const result = await api.publicationRequests.list(page);
    return {
      status: result.data.length === 0 ? 'empty' : 'ready',
      requests: result.data,
      hasMore: result.meta.has_more === true,
      lastPage: result.meta.last_page,
      total: result.meta.total,
    };
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error ? error.status : null;
    // En error no se conservan datos anteriores como actuales (CA-17).
    return {
      status: status === 403 ? 'forbidden' : 'error',
      requests: [],
      hasMore: false,
      lastPage: 1,
      total: 0,
    };
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
  const goToPage = useCallback((target: number) => setPage(Math.max(1, Math.floor(target) || 1)), []);

  return { ...state, page, reload, goToPage };
}
