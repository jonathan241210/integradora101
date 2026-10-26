export interface Animal {
  id: string;
  nickname: string;
  commonName: string;
  scientificName: string;
  imageUrl?: string;
  category?: 'mammals' | 'birds' | 'reptiles' | 'aquatic';
  zone: string;
  isDiscovered: boolean;
  discoveredAt?: string | null;
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

export type MapPlaceKind = 'animal' | 'service' | 'entrance';

export interface MapSection {
  id: string;
  name: string;
  svgZoneId: string;
}

export interface MapPlace {
  id: string;
  name: string;
  kind: MapPlaceKind;
  sectionId: string;
  description?: string;
  mapX: number;
  mapY: number;
  visible: boolean;
}

export type MapFilter = 'all' | 'animal' | 'service';

export type VisitorPreferenceKey = 'notifications' | 'location';

export interface VisitorPreferences {
  notifications: boolean;
  location: boolean;
}

export interface VisitorAccountSummary {
  displayName: string;
  email: string;
}

export interface InfoSection {
  id: string;
  title: string;
  body: string;
}

export type QrOutcome = 'valid' | 'invalid' | 'already-discovered';

export interface QrSimulation {
  outcome: QrOutcome;
  animalId?: string;
}
