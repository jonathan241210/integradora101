import { useCallback } from 'react';
import {
  AnimalRepository,
  ZooRepository,
  type HomeListRefresh,
  createAnimalRepository,
  createZooRepository,
} from '../repositories';
import { Animal, ZooEvent, News } from '../models';

export type { HomeListRefresh };

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

  const getNews = useCallback(async (): Promise<News[]> => {
    return await zooRepo.getNews();
  }, [zooRepo]);

  const getNewsDetails = useCallback(async (id: string): Promise<News | null> => {
    return await zooRepo.getNewsById(id);
  }, [zooRepo]);

  const reloadNewsDetails = useCallback(async (id: string): Promise<News | null> => {
    return await zooRepo.reloadNewsById(id);
  }, [zooRepo]);

  const refreshNewsAndEvents = useCallback(async (mode?: HomeListRefresh) => {
    return await zooRepo.refreshNewsAndEvents(mode);
  }, [zooRepo]);

  const loadHomeData = useCallback(async (onRevalidated?: {
    news: (news: News[]) => void;
    events: (events: ZooEvent[]) => void;
  }) => {
    const [animals, zooEvents, zooNews] = await Promise.all([
      animalRepo.getAllAnimals(),
      zooRepo.getEvents(onRevalidated?.events),
      zooRepo.getNews(onRevalidated?.news),
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
    getNewsDetails,
    reloadNewsDetails,
    refreshNewsAndEvents,
    loadHomeData,
  };
}

const defaultAnimalRepository = createAnimalRepository();
const defaultZooRepository = createZooRepository();
