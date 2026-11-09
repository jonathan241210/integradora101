import { MOCK_ANIMALS } from '../mocks/zoo';
import { MapPlace } from '../models';

export interface AnimalCardData {
  title: string;
  subtitle?: string;
  scientificName?: string;
  categoryLabel?: string;
  diet?: string;
  funFact?: string;
  description: string;
  iconEmoji: string;
  animalsCount: number;
}

export interface EnclosureAnimalDetail {
  id: string;
  nickname: string;
  commonName: string;
  scientificName?: string;
  sex: 'Macho' | 'Hembra' | string;
  age: string;
  origin: string;
  longevity: string;
  diet: string;
  reproduction: string;
  veterinaryStatus: string;
  funFact?: string;
  iconEmoji: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  mammals: 'Mamífero',
  birds: 'Ave',
  reptiles: 'Reptil',
  aquatic: 'Fauna Acuática',
};

const EMOJI_MAP: Record<string, string> = {
  juan: '🐯',
  simba: '🦁',
  penguin: '🐧',
  monkey: '🐒',
  elephant: '🐘',
  'bird-aviary': '🦜',
  'reptile-house': '🦎',
};

const ENCLOSURE_ANIMALS_CATALOG: Record<string, EnclosureAnimalDetail[]> = {
  monkey: [
    {
      id: 'monkey-koko',
      nickname: 'Koko',
      commonName: 'Mono Araña',
      scientificName: 'Ateles geoffroyi',
      sex: 'Macho',
      age: '5 años',
      origin: 'Selva Lacandona, Chiapas (Rescate)',
      longevity: '25 años',
      diet: 'Frutas maduras, hojas tiernas, semillas y flores',
      reproduction: 'Gestación de 225 días • 1 cría por camada',
      veterinaryStatus: 'Sano, desparasitado y activo en arbolado',
      funFact: 'Su cola prensil actúa como una quinta mano capaz de sostener todo su peso corporal.',
      iconEmoji: '🐒',
    },
    {
      id: 'monkey-chita',
      nickname: 'Chita',
      commonName: 'Mono Araña',
      scientificName: 'Ateles geoffroyi',
      sex: 'Hembra',
      age: '4 años',
      origin: 'Rescate PROFEPA Hidalgo',
      longevity: '25 años',
      diet: 'Frutas tropicales, vegetales y néctar',
      reproduction: 'Madurez sexual a los 4 años • Periodo reproductivo anual',
      veterinaryStatus: 'Excelente condición física y sociable en grupo',
      funFact: 'Muy comunicativa mediante vocalizaciones de contacto y silbidos.',
      iconEmoji: '🐒',
    },
  ],
  juan: [
    {
      id: 'tiger-juan',
      nickname: 'Juan',
      commonName: 'Tigre de Bengala',
      scientificName: 'Panthera tigris tigris',
      sex: 'Macho',
      age: '6 años',
      origin: 'Unidad de Manejo Ambiental (UMA acreditada)',
      longevity: '15 - 18 años',
      diet: 'Carnívoro • 8 a 10 kg diarios de carne fresca con suplemento vitamínico',
      reproduction: 'Gestación de 105 días • Camadas de 2 a 4 cachorros',
      veterinaryStatus: 'Control dental y peso óptimo (220 kg)',
      funFact: 'A diferencia de la mayoría de los felinos, le encanta nadar y sumergirse en su estanque.',
      iconEmoji: '🐯',
    },
  ],
  simba: [
    {
      id: 'lion-simba',
      nickname: 'Simba',
      commonName: 'León Africano',
      scientificName: 'Panthera leo',
      sex: 'Macho',
      age: '7 años',
      origin: 'Intercambio zoológico nacional regulado',
      longevity: '14 - 16 años',
      diet: 'Carnívoro estricto • Dieta cárnica balanceada',
      reproduction: 'Gestación de 110 días • Madurez sexual a los 3 años',
      veterinaryStatus: 'Vacunación al corriente y melena densa',
      funFact: 'Su rugido supera los 114 decibelios y se puede escuchar a más de 8 km de distancia.',
      iconEmoji: '🦁',
    },
    {
      id: 'lion-nala',
      nickname: 'Nala',
      commonName: 'León Africano',
      scientificName: 'Panthera leo',
      sex: 'Hembra',
      age: '5 años',
      origin: 'UMA Tulancingo de Conservación',
      longevity: '15 - 18 años',
      diet: 'Carnívoro estricto',
      reproduction: 'Camadas de 2 a 4 cachorros • Cuidado comunal',
      veterinaryStatus: 'Sana y ágil en actividades grupales',
      funFact: 'En manada, las leonas realizan la mayor parte de las exploraciones coordinadas.',
      iconEmoji: '🦁',
    },
  ],
  penguin: [
    {
      id: 'penguin-pipo',
      nickname: 'Pipo',
      commonName: 'Pingüino Emperador',
      scientificName: 'Aptenodytes forsteri',
      sex: 'Macho',
      age: '4 años',
      origin: 'Programa de Conservación Marina',
      longevity: '20 años',
      diet: 'Piscívoro • Pescado entero fresco y calamar',
      reproduction: 'Monógamos estacionales • Incubación de 64 días sobre las patas',
      veterinaryStatus: 'Plumaje impermeable óptimo y peso ideal (30 kg)',
      funFact: 'Sus plumas forman una capa aislante de doble densidad impenetrable al viento y al agua.',
      iconEmoji: '🐧',
    },
    {
      id: 'penguin-maya',
      nickname: 'Maya',
      commonName: 'Pingüino Emperador',
      scientificName: 'Aptenodytes forsteri',
      sex: 'Hembra',
      age: '3 años',
      origin: 'Programa de Conservación Marina',
      longevity: '20 años',
      diet: 'Piscívoro • Peces marinos enriquecidos con calcio',
      reproduction: 'Pone un solo huevo por temporada reproductiva',
      veterinaryStatus: 'Monitoreo de natación y densidad ósea saludable',
      funFact: 'Puede bucear durante más de 18 minutos conteniendo la respiración.',
      iconEmoji: '🐧',
    },
  ],
  elephant: [
    {
      id: 'elephant-dumbo',
      nickname: 'Dumbo',
      commonName: 'Elefante Asiático',
      scientificName: 'Elephas maximus',
      sex: 'Macho',
      age: '18 años',
      origin: 'Santuario Internacional de Fauna Silvestre',
      longevity: '60 - 70 años',
      diet: 'Herbívoro • 150 kg diarios de heno, ramas tiernas, follaje y frutas',
      reproduction: 'Gestación de 22 meses (la más larga del reino animal terrestre)',
      veterinaryStatus: 'Cuidado podológico quincenal y revisión de colmillos',
      funFact: 'Posee más de 40,000 músculos en su trompa y reconoce frecuencias sísmicas a kilómetros.',
      iconEmoji: '🐘',
    },
  ],
  'bird-aviary': [
    {
      id: 'aviary-paco',
      nickname: 'Paco',
      commonName: 'Guacamaya Roja',
      scientificName: 'Ara macao',
      sex: 'Macho',
      age: '8 años',
      origin: 'Rescate de Tráfico de Aves Silvestres',
      longevity: '50 años',
      diet: 'Semillas duras, nueces, frutos silvestres e higos',
      reproduction: 'Monógamo permanente • Puestas de 2 a 3 huevos en oquedades',
      veterinaryStatus: 'Plumaje completo y pico en alineación correcta',
      funFact: 'La fuerza de su mandíbula puede romper fácilmente nueces de cáscara extremadamente dura.',
      iconEmoji: '🦜',
    },
  ],
  'reptile-house': [
    {
      id: 'reptile-rex',
      nickname: 'Rex',
      commonName: 'Iguana Verde',
      scientificName: 'Iguana iguana',
      sex: 'Macho',
      age: '6 años',
      origin: 'Donación registrada PROFEPA',
      longevity: '20 años',
      diet: 'Herbívoro folívoro • Hojas verdes, brotes de flores y fruta fresca',
      reproduction: 'Ovíparo • 20 a 40 huevos por puesta',
      veterinaryStatus: 'Ambiente climatizado con radiación UVB adecuada',
      funFact: 'Posee un ojo parietal fotosensible en la coronilla que detecta sombras de depredadores.',
      iconEmoji: '🦎',
    },
  ],
};

function normalizeSex(rawSex?: string): string {
  if (!rawSex) return 'No especificado';
  const s = rawSex.trim().toUpperCase();
  if (s === 'M' || s === 'MACHO') return 'Macho';
  if (s === 'H' || s === 'F' || s === 'HEMBRA') return 'Hembra';
  return rawSex;
}

function getEmojiForSpecies(name?: string): string {
  if (!name) return '🐾';
  const lower = name.toLowerCase();
  if (lower.includes('jaguar') || lower.includes('tigre') || lower.includes('leopardo')) return '🐯';
  if (lower.includes('leon') || lower.includes('león')) return '🦁';
  if (lower.includes('mono') || lower.includes('primate') || lower.includes('chimpance')) return '🐒';
  if (lower.includes('ping') || lower.includes('pinguino') || lower.includes('pingüino')) return '🐧';
  if (lower.includes('elefante')) return '🐘';
  if (lower.includes('ave') || lower.includes('pajaro') || lower.includes('pájaro') || lower.includes('guacamaya') || lower.includes('loro') || lower.includes('tucan')) return '🦜';
  if (lower.includes('reptil') || lower.includes('iguana') || lower.includes('serpiente') || lower.includes('cocodrilo')) return '🦎';
  if (lower.includes('oso')) return '🐻';
  if (lower.includes('lobo') || lower.includes('coyote')) return '🐺';
  if (lower.includes('venado') || lower.includes('ciervo')) return '🦌';
  return '🐾';
}

export function getEnclosureAnimalsList(place: MapPlace): EnclosureAnimalDetail[] {
  // 1. PRIORIDAD MÁXIMA: Animales reales traídos desde la Base de Datos / API
  if (place.animals && place.animals.length > 0) {
    return place.animals.map((item, index) => {
      const emoji = EMOJI_MAP[place.id.toLowerCase()] ??
        getEmojiForSpecies(item.speciesName || item.name) ??
        '🐾';

      return {
        id: item.id || `${place.id}-animal-${index}`,
        nickname: item.name || `Ejemplar ${index + 1}`,
        commonName: item.speciesName || place.name,
        scientificName: item.scientificName,
        sex: normalizeSex(item.sex),
        age: item.age || 'Adulto',
        origin: item.origin || 'Zoológico Municipal Nicolás Bravo',
        longevity: item.longevity || 'N/A',
        diet: item.diet || 'Alimentación especializada balanceada',
        reproduction: item.reproduction || 'Bajo monitoreo reproductivo',
        veterinaryStatus: item.veterinaryStatus || 'Control veterinario regular al día',
        funFact: item.characteristics || item.funFact || place.description,
        iconEmoji: emoji,
      };
    });
  }

  // 2. Si no hay datos en place.animals, buscar en catálogo mock enriquecido para modo offline / pruebas
  const catalogList = ENCLOSURE_ANIMALS_CATALOG[place.id.toLowerCase()];
  if (catalogList && catalogList.length > 0) {
    return catalogList;
  }

  // 3. Fallback con el animal individual de MOCK_ANIMALS
  const matchedAnimal = MOCK_ANIMALS.find(
    (a) =>
      a.id.toLowerCase() === place.id.toLowerCase() ||
      place.name.toLowerCase().includes(a.nickname.toLowerCase()) ||
      place.name.toLowerCase().includes(a.commonName.toLowerCase()) ||
      place.description?.toLowerCase().includes(a.nickname.toLowerCase()),
  );

  if (matchedAnimal) {
    return [
      {
        id: matchedAnimal.id,
        nickname: matchedAnimal.nickname,
        commonName: matchedAnimal.commonName,
        scientificName: matchedAnimal.scientificName,
        sex: 'Macho',
        age: 'Adulto',
        origin: matchedAnimal.zone || 'Zoológico Nicolás Bravo',
        longevity: matchedAnimal.stats?.lifeExpectancy || '15 años',
        diet: matchedAnimal.diet || 'Dieta balanceada',
        reproduction: 'Bajo monitoreo zoológico',
        veterinaryStatus: 'Sano y activo',
        funFact: matchedAnimal.funFact || matchedAnimal.curiosities,
        iconEmoji: EMOJI_MAP[matchedAnimal.id] ?? '🐾',
      },
    ];
  }

  // 4. Fallback genérico para recintos sin catálogo
  return [
    {
      id: `${place.id}-general`,
      nickname: place.name,
      commonName: place.name,
      sex: 'N/A',
      age: 'N/A',
      origin: 'Tulancingo, Hidalgo',
      longevity: 'N/A',
      diet: 'Alimentación especializada',
      reproduction: 'N/A',
      veterinaryStatus: 'Recinto supervisado',
      funFact: place.description,
      iconEmoji: place.kind === 'animal' ? '🐾' : '📍',
    },
  ];
}

export function getAnimalCardData(place: MapPlace): AnimalCardData {
  const animalsList = getEnclosureAnimalsList(place);
  const first = animalsList[0];

  const animalsSummary = animalsList
    .map((a) => `${a.nickname} (${a.sex})`)
    .join(', ');

  const description = animalsList.length > 1
    ? `En este recinto habitan: ${animalsSummary}.`
    : (place.description ?? `Recinto de ${first.commonName}`);

  return {
    title: place.name,
    subtitle: `${animalsList.length} ${animalsList.length === 1 ? 'ejemplar' : 'ejemplares'}: ${animalsSummary}`,
    scientificName: first.scientificName,
    categoryLabel: place.kind === 'animal' ? 'Recinto de fauna' : 'Punto de interés',
    diet: first.diet,
    funFact: first.funFact,
    description,
    iconEmoji: first.iconEmoji,
    animalsCount: animalsList.length,
  };
}
