import { useCallback } from 'react';
import { AnimalRepository, AnimalRepositoryImpl } from '../repositories';
import { Animal } from '../models';

const defaultRepository = new AnimalRepositoryImpl();

export function useAnimalViewModel(repository: AnimalRepository = defaultRepository) {
  const getAnimals = useCallback(async (query?: string, category?: Animal['category'] | 'all') => {
    const all = await repository.getAllAnimals();
    const normalizedQuery = query?.trim().toLocaleLowerCase();
    return all.filter((animal) => {
      const matchesQuery = !normalizedQuery || (
        `${animal.nickname} ${animal.commonName} ${animal.scientificName} ${animal.zone}`
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      );
      const matchesCategory = !category || category === 'all' || animal.category === category;
      return matchesQuery && matchesCategory;
    }
    );
  }, [repository]);

  const getAnimalDetails = useCallback(async (id: string) => {
    return repository.getAnimalById(id);
  }, [repository]);

  return {
    getAnimals,
    getAnimalDetails,
  };
}
