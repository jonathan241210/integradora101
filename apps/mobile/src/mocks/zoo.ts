import { Achievement, Animal, User, Mission, Reward, LeaderboardEntry, ZooEvent, News, MapLocation, MapRoute, QrOutcome } from '../models';

export const MOCK_ANIMALS: Animal[] = [
  {
    id: 'juan',
    nickname: 'Juan',
    commonName: 'Tigre de Bengala',
    scientificName: 'Panthera tigris tigris',
    category: 'mammals',
    zone: 'Sector Felinos — Zona B3',
    isDiscovered: true,
    placeholderTint: '#FFB84D',
    stats: { avgWeight: '220 kg', size: '3 m', lifeExpectancy: '15 años' },
    diet: 'Carnívoro',
    curiosities: 'Tienen rayas únicas como huellas dactilares.',
    funFact: 'Pueden nadar largas distancias.',
  },
  {
    id: 'simba',
    nickname: 'Simba',
    commonName: 'León Africano',
    scientificName: 'Panthera leo',
    category: 'mammals',
    zone: 'Sabana Africana — Zona A1',
    isDiscovered: true,
    placeholderTint: '#F4A460',
    stats: { avgWeight: '190 kg', size: '2.5 m', lifeExpectancy: '12 años' },
    diet: 'Carnívoro',
    curiosities: 'El rugido se escucha a 8 km.',
    funFact: 'Pasan hasta 20 horas al día descansando.',
  },
  {
    id: 'elephant',
    nickname: 'Dumbo',
    commonName: 'Elefante Asiático',
    scientificName: 'Elephas maximus',
    category: 'mammals',
    zone: 'Bosque Tropical — Zona C2',
    isDiscovered: false,
    placeholderTint: '#B0C4DE',
    stats: { avgWeight: '4000 kg', size: '3 m', lifeExpectancy: '60 años' },
    diet: 'Herbívoro',
    curiosities: 'Tienen una memoria excepcional.',
    funFact: 'Se comunican mediante infrasonidos.',
  },
  {
    id: 'monkey',
    nickname: 'Koko',
    commonName: 'Mono Araña',
    scientificName: 'Ateles geoffroyi',
    category: 'mammals',
    zone: 'Bosque Tropical — Zona C2',
    isDiscovered: false,
    placeholderTint: '#8B4513',
    stats: { avgWeight: '9 kg', size: '0.6 m', lifeExpectancy: '25 años' },
    diet: 'Omnívoro',
    curiosities: 'Su cola actúa como una quinta mano.',
    funFact: 'Viven en grupos sociales complejos.',
  },
  {
    id: 'penguin',
    nickname: 'Pipo',
    commonName: 'Pingüino Emperador',
    scientificName: 'Aptenodytes patagonicus',
    category: 'birds',
    zone: 'Cala de Pingüinos — Zona D1',
    isDiscovered: false,
    placeholderTint: '#ADD8E6',
    stats: { avgWeight: '30 kg', size: '1.1 m', lifeExpectancy: '20 años' },
    diet: 'Piscívoro',
    curiosities: 'Soportan temperaturas extremas.',
    funFact: 'El macho incuba el huevo sobre sus patas.',
  },
];

export const MOCK_USER: User = {
  id: 'user-1',
  name: 'María García',
  avatar: 'avatar-placeholder',
  level: 4,
  rank: 'Explorador Experto',
  points: 2450,
  discoveredCount: 12,
  totalAnimals: 45,
};

export const MOCK_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Safari Matutino', objective: 'Descubre cinco animales de la sabana durante tu visita.', progress: 3, total: 5, reward: 'Insignia de Oro' },
  { id: 'm2', title: 'Observador de Aves', objective: 'Encuentra y descubre un ave en el zoológico.', progress: 0, total: 1, reward: 'Certificado de Experto' },
];

export const MOCK_REWARDS: Reward[] = [
  { id: 'r1', name: 'Sombrero Gris', icon: 'hat-icon' },
  { id: 'r2', name: 'Novato', icon: 'newbie-icon' },
  { id: 'r3', name: 'Explorador', icon: 'explorer-icon' },
  { id: 'r4', name: 'Maestro', icon: 'master-icon' },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'l1', name: 'Carlos Ruiz', points: 3100, rank: 1, isCurrentUser: false },
  { id: 'l2', name: 'María García', points: 2450, rank: 2, isCurrentUser: true },
  { id: 'l3', name: 'Ana López', points: 2100, rank: 3, isCurrentUser: false },
];

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-discovery',
    title: 'Primer descubrimiento',
    description: 'Tu primera gran aventura comienza con un descubrimiento.',
    icon: 'pets',
    points: 100,
    action: 'Descubriste al Tigre de Bengala.',
    requirement: 'Descubre cualquier animal.',
    unlocked: true,
    earnedAt: '2026-10-09T10:15:00-06:00',
  },
  {
    id: 'habitat-explorer',
    title: 'Explorador de hábitats',
    description: 'Visitaste distintos rincones del zoológico.',
    icon: 'explore',
    points: 250,
    action: 'Exploraste los hábitats de felinos y sabana.',
    requirement: 'Explora tres hábitats diferentes.',
    unlocked: true,
    earnedAt: '2026-10-08T14:30:00-06:00',
  },
  {
    id: 'mission-starter',
    title: 'Misión cumplida',
    description: 'Completaste tu primera misión de exploración.',
    icon: 'emoji-events',
    points: 150,
    action: 'Completaste la misión de bienvenida.',
    requirement: 'Completa una misión.',
    unlocked: true,
    earnedAt: '2026-10-07T12:00:00-06:00',
  },
  {
    id: 'bird-watcher',
    title: 'Observador de aves',
    description: 'Demuestra atención a las especies emplumadas.',
    icon: 'visibility',
    points: 200,
    action: '',
    requirement: 'Descubre tres especies de aves.',
    unlocked: false,
  },
  {
    id: 'zoo-photographer',
    title: 'Mirada curiosa',
    description: 'Recorre el zoológico y descubre nuevas especies.',
    icon: 'photo-camera',
    points: 300,
    action: '',
    requirement: 'Descubre diez animales.',
    unlocked: false,
  },
  {
    id: 'mission-master',
    title: 'Maestro de misiones',
    description: 'Completa desafíos y conviértete en referente de exploración.',
    icon: 'military-tech',
    points: 500,
    action: '',
    requirement: 'Completa cinco misiones.',
    unlocked: false,
  },
];

export const MOCK_MILESTONES = [
  { id: 'milestone-1', title: 'Visitaste el hábitat de felinos', date: 'Hoy' },
  { id: 'milestone-2', title: 'Descubriste 10 animales', date: 'Esta semana' },
  { id: 'milestone-3', title: 'Completaste tu primera misión', date: 'Este mes' },
];

export const MOCK_MAP_LOCATIONS: MapLocation[] = [
  { id: 'tiger-habitat', label: 'Hábitat Tigre', kind: 'animal', left: 56, top: 31 },
  { id: 'restrooms', label: 'Baños', kind: 'service', left: 18, top: 56 },
];

export const MOCK_MAP_ROUTE: MapRoute = {
  destination: 'Hábitat del Tigre',
  duration: '8 min',
  distance: '450 m',
  direction: 'Noroeste',
  steps: ['Sigue el sendero principal', 'Gira a la izquierda en el lago'],
};

export const MOCK_QR_SIMULATIONS: Record<QrOutcome, { outcome: QrOutcome; animalId?: string }> = {
  valid: { outcome: 'valid', animalId: 'elephant' },
  invalid: { outcome: 'invalid' },
  'already-discovered': { outcome: 'already-discovered', animalId: 'juan' },
};

export const MOCK_EVENTS: ZooEvent[] = [
  {
    id: 'e1',
    title: 'Alimentación de Pingüinos',
    date: '12 de octubre de 2026',
    time: '11:30',
    location: 'Cala de Pingüinos',
    description: 'Acompaña al equipo de cuidado durante la alimentación y conoce cómo se prepara la dieta de los pingüinos.',
    imageUrls: [],
  },
  {
    id: 'e2',
    title: 'Plática: El Rugido del Tigre',
    date: '12 de octubre de 2026',
    time: '14:00',
    location: 'Sector Felinos',
    description: 'Conoce datos sobre el comportamiento, la comunicación y el cuidado de los tigres.',
    imageUrls: [],
  },
];

export const MOCK_NEWS: News = {
  title: 'Nacimiento de Jirafa',
  body: '¡Una nueva integrante ha llegado a nuestra familia!',
};
