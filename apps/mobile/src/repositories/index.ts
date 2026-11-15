import { Achievement, Animal, User, Mission, ZooEvent, News, MapPlace, MapSection } from '../models';
import { MOCK_ANIMALS, MOCK_USER, MOCK_MISSIONS, MOCK_EVENTS, MOCK_NEWS, MOCK_ACHIEVEMENTS, MOCK_MILESTONES, MOCK_MAP_SECTIONS, MOCK_MAP_PLACES } from '../mocks/zoo';

export interface AnimalRepository {
  getAllAnimals(): Promise<Animal[]>;
  getAnimalById(id: string): Promise<Animal | null>;
  getFeaturedAnimals(): Promise<Animal[]>;
}

export interface UserRepository {
  getUser(): Promise<User>;
  getMissions(): Promise<Mission[]>;
  getAchievements(): Promise<Achievement[]>;
  getMilestones(): Promise<{ id: string; title: string; date: string }[]>;
}

export interface ZooRepository {
  getEvents(): Promise<ZooEvent[]>;
  getEventById(id: string): Promise<ZooEvent | null>;
  getNews(): Promise<News[]>;
  getNewsById(id: string): Promise<News | null>;
  refreshNewsAndEvents(): Promise<{ news: News[]; events: ZooEvent[] }>;
}

export interface MapRepository {
  getPlaces(): Promise<MapPlace[]>;
  getSections(): Promise<MapSection[]>;
}

export class AnimalRepositoryImpl implements AnimalRepository {
  async getAllAnimals(): Promise<Animal[]> {
    return Promise.resolve(MOCK_ANIMALS);
  }

  async getAnimalById(id: string): Promise<Animal | null> {
    const animal = MOCK_ANIMALS.find(a => a.id === id);
    return animal !== undefined ? animal : null;
  }

  async getFeaturedAnimals(): Promise<Animal[]> {
    return Promise.resolve(MOCK_ANIMALS.slice(0, 3));
  }
}

export class UserRepositoryImpl implements UserRepository {
  async getUser(): Promise<User> {
    return Promise.resolve(MOCK_USER);
  }

  async getMissions(): Promise<Mission[]> {
    return Promise.resolve(MOCK_MISSIONS);
  }

  async getAchievements(): Promise<Achievement[]> {
    return Promise.resolve(MOCK_ACHIEVEMENTS);
  }

  async getMilestones(): Promise<{ id: string; title: string; date: string }[]> {
    return Promise.resolve(MOCK_MILESTONES);
  }
}

export class ZooRepositoryImpl implements ZooRepository {
  async getEvents(): Promise<ZooEvent[]> {
    return Promise.resolve(MOCK_EVENTS);
  }

  async getEventById(id: string): Promise<ZooEvent | null> {
    const event = MOCK_EVENTS.find(e => e.id === id);
    return Promise.resolve(event !== undefined ? event : null);
  }

  async getNews(): Promise<News[]> {
    return Promise.resolve([MOCK_NEWS]);
  }

  async getNewsById(id: string): Promise<News | null> {
    return Promise.resolve(MOCK_NEWS.id === id ? MOCK_NEWS : null);
  }

  async refreshNewsAndEvents(): Promise<{ news: News[]; events: ZooEvent[] }> {
    const [news, events] = await Promise.all([this.getNews(), this.getEvents()]);
    return { news, events };
  }
}

export class MapRepositoryImpl implements MapRepository {
  async getPlaces(): Promise<MapPlace[]> {
    return MOCK_MAP_PLACES;
  }

  async getSections(): Promise<MapSection[]> {
    return MOCK_MAP_SECTIONS;
  }
}

// Exportamos las implementaciones reales con API y caché
export { ApiAnimalRepository } from './apiAnimalRepository';
export { ApiZooRepository } from './apiZooRepository';
export { ApiMapRepository, CACHE_KEY_MAP_PLACES } from './apiMapRepository';
export * from './mappers';
export * from './storage';

/**
 * Factorías que resuelven si se usan mocks o la API real según variable de entorno.
 */
import { ApiAnimalRepository } from './apiAnimalRepository';
import { ApiZooRepository } from './apiZooRepository';
import { ApiMapRepository } from './apiMapRepository';

export function createAnimalRepository(): AnimalRepository {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
    return new AnimalRepositoryImpl();
  }
  if (process.env.NODE_ENV === 'test' && process.env.EXPO_PUBLIC_USE_API !== 'true') {
    return new AnimalRepositoryImpl();
  }
  return new ApiAnimalRepository();
}

export function createZooRepository(): ZooRepository {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
    return new ZooRepositoryImpl();
  }
  if (process.env.NODE_ENV === 'test' && process.env.EXPO_PUBLIC_USE_API !== 'true') {
    return new ZooRepositoryImpl();
  }
  return new ApiZooRepository();
}

export function createMapRepository(): MapRepository {
  if (process.env.EXPO_PUBLIC_USE_MOCKS === 'true') {
    return new MapRepositoryImpl();
  }
  if (process.env.NODE_ENV === 'test' && process.env.EXPO_PUBLIC_USE_API !== 'true') {
    return new MapRepositoryImpl();
  }
  return new ApiMapRepository();
}
