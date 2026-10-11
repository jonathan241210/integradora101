import { Achievement, Animal, User, Mission, Reward, LeaderboardEntry, ZooEvent, News, MapLocation, MapRoute, QrOutcome, QrSimulation } from '../models';
import { MOCK_ANIMALS, MOCK_USER, MOCK_MISSIONS, MOCK_REWARDS, MOCK_LEADERBOARD, MOCK_EVENTS, MOCK_NEWS, MOCK_ACHIEVEMENTS, MOCK_MILESTONES, MOCK_MAP_LOCATIONS, MOCK_MAP_ROUTE, MOCK_QR_SIMULATIONS } from '../mocks/zoo';

export interface AnimalRepository {
  getAllAnimals(): Promise<Animal[]>;
  getAnimalById(id: string): Promise<Animal | null>;
  getFeaturedAnimals(): Promise<Animal[]>;
}

export interface UserRepository {
  getUser(): Promise<User>;
  getMissions(): Promise<Mission[]>;
  getRewards(): Promise<Reward[]>;
  getLeaderboard(): Promise<LeaderboardEntry[]>;
  getAchievements(): Promise<Achievement[]>;
  getMilestones(): Promise<{ id: string; title: string; date: string }[]>;
}

export interface ZooRepository {
  getEvents(): Promise<ZooEvent[]>;
  getNews(): Promise<News>;
}

export interface MapRepository {
  getLocations(): Promise<MapLocation[]>;
  getActiveRoute(): Promise<MapRoute>;
}

export interface QrRepository {
  simulateScan(outcome: QrOutcome): Promise<QrSimulation>;
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
    // For demo, return first 3 animals as featured
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

  async getRewards(): Promise<Reward[]> {
    return Promise.resolve(MOCK_REWARDS);
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    return Promise.resolve(MOCK_LEADERBOARD);
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

  async getNews(): Promise<News> {
    return Promise.resolve(MOCK_NEWS);
  }
}

export class MapRepositoryImpl implements MapRepository {
  async getLocations(): Promise<MapLocation[]> {
    return MOCK_MAP_LOCATIONS;
  }

  async getActiveRoute(): Promise<MapRoute> {
    return MOCK_MAP_ROUTE;
  }
}

export class QrRepositoryImpl implements QrRepository {
  async simulateScan(outcome: QrOutcome): Promise<QrSimulation> {
    return MOCK_QR_SIMULATIONS[outcome];
  }
}
