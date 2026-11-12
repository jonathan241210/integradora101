import { useCallback, useEffect, useState } from 'react';
import { favoriteAnimals } from '../repositories/favoriteAnimals';

export function useFavoriteAnimals() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void favoriteAnimals.list().then((next) => {
      if (active) setIds(next);
    });
    const unsubscribe = favoriteAnimals.subscribe((next) => {
      if (active) setIds(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const toggle = useCallback((id: string) => favoriteAnimals.toggle(id), []);

  return { ids, toggle };
}
