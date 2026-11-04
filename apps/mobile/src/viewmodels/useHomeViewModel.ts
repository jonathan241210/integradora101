import { useCallback } from 'react';
import {
  AnimalRepository,
  ZooRepository,
  createAnimalRepository,
  createZooRepository,
} from '../repositories';
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

  const getEventDetails = useCallback(async (id: string): Promise<ZooEvent | null> => {
    return await zooRepo.getEventById(id);
  }, [zooRepo]);

  const getNews = useCallback(async (): Promise<News> => {
    return await zooRepo.getNews();
  }, [zooRepo]);

  const loadHomeData = useCallback(async () => {
    const [animals, zooEvents, zooNews] = await Promise.all([
      animalRepo.getFeaturedAnimals(),
      zooRepo.getEvents(),
      zooRepo.getNews(),
    ]);
    return {
      animals,
      events: zooEvents,
      news: zooNews,
    };
  }, [animalRepo, zooRepo]);

  return {
    getFeaturedAnimals,
    getEvents,
    getEventDetails,
    getNews,
    loadHomeData,
  };
}

const defaultAnimalRepository = createAnimalRepository();
const defaultZooRepository = createZooRepository();
