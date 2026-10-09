import { useCallback } from 'react';
import { AnimalRepository, AnimalRepositoryImpl, ZooRepository, ZooRepositoryImpl } from '../repositories';
import { Animal, ZooEvent, News } from '../models';

export function useHomeViewModel(
  animalRepo: AnimalRepository = defaultAnimalRepository,
  zooRepo: ZooRepository = defaultZooRepository
) {
  const getFeaturedAnimals = useCallback(async (): Promise<Animal[]> => {
    return await animalRepo.getFeaturedAnimals();
  }, [animalRepo]);

  const getEvents = useCallback(async (): Promise<ZooEvent[]> => {
    return await zooRepo.getEvents();
  }, [zooRepo]);

  const getNews = useCallback(async (): Promise<News> => {
    return await zooRepo.getNews();
  }, [zooRepo]);

  return {
    getFeaturedAnimals,
    getEvents,
    getNews,
  };
}

const defaultAnimalRepository = new AnimalRepositoryImpl();
const defaultZooRepository = new ZooRepositoryImpl();