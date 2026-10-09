import { useCallback } from 'react';
import { MapRepository, MapRepositoryImpl } from '../repositories';

const defaultRepository = new MapRepositoryImpl();

export function useMapViewModel(repository: MapRepository = defaultRepository) {
  const getMapData = useCallback(async () => {
    const [locations, activeRoute] = await Promise.all([
      repository.getLocations(),
      repository.getActiveRoute(),
    ]);
    return { locations, activeRoute };
  }, [repository]);

  return { getMapData };
}
