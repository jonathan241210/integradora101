export interface Animal {
  id: string;
  nickname: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string;
  category?: 'mammals' | 'birds' | 'reptiles' | 'aquatic';
  zone: string;
  isDiscovered: boolean;
  placeholderTint: string;
  stats?: {
    avgWeight: string;
    size: string;
    lifeExpectancy: string;
  };
  diet?: string;
  curiosities?: string;
  funFact?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  level: number;
  rank: string;
  points: number;
  discoveredCount: number;
  totalAnimals: number;
}

export interface Mission {
  id: string;
  title: string;
  objective: string;
  progress: number;
  total: number;
  reward: string;
}

export interface Reward {
  id: string;
  name: string;
  icon: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  points: number;
  rank: number;
  isCurrentUser: boolean;
}

export interface ZooEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  imageUrls?: string[];
}

export interface News {
  title: string;
  body: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  action: string;
  requirement: string;
  unlocked: boolean;
  earnedAt?: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
}

export interface MapLocation {
  id: string;
  label: string;
  kind: 'animal' | 'service';
  left: number;
  top: number;
}

export interface MapRoute {
  destination: string;
  duration: string;
  distance: string;
  direction: string;
  steps: string[];
}

export type QrOutcome = 'valid' | 'invalid' | 'already-discovered';

export interface QrSimulation {
  outcome: QrOutcome;
  animalId?: string;
}
