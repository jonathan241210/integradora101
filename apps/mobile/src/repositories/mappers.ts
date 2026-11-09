import { Animal, MapPlace, ZooEvent } from '../models';
import { SVG_HEIGHT, SVG_WIDTH, ZOO_BOUNDS } from '../constants/zoo';
import { geoTransform } from '../utils/geoTransform';

export interface ApiSpeciesResponse {
  id: number | string;
  common_name: string;
  scientific_name: string;
  category?: 'mammals' | 'birds' | 'reptiles' | 'aquatic' | 'mammal' | 'bird' | 'reptile' | string;
  image_url?: string | null;
  photo_path?: string | null;
  zone_name?: string | null;
  placeholder_tint?: string | null;
  avg_weight?: string | null;
  size?: string | null;
  size_cm?: number | string | null;
  life_expectancy?: string | null;
  longevity?: string | null;
  diet?: string | null;
  diet_description?: string | null;
  curiosities?: string | null;
  fun_fact?: string | null;
  characteristics?: string | null;
}

export interface ApiEventResponse {
  id: number | string;
  name?: string;
  title?: string;
  date?: string;
  start_date?: string;
  end_date?: string;
  time?: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  description?: string;
  image_path?: string | null;
  image_urls?: string[] | null;
}

/**
 * Normaliza la categoría según las permitidas por el modelo UI
 */
function normalizeCategory(category?: string): 'mammals' | 'birds' | 'reptiles' | 'aquatic' | undefined {
  if (!category) return undefined;
  const lower = category.toLowerCase();
  if (lower.startsWith('mammal')) return 'mammals';
  if (lower.startsWith('bird')) return 'birds';
  if (lower.startsWith('reptile')) return 'reptiles';
  if (lower.startsWith('aquatic') || lower.startsWith('fish') || lower.startsWith('amphibian')) return 'aquatic';
  return undefined;
}

/**
 * Mapea una especie o animal de la API a la interfaz Animal de UI (camelCase).
 * Cumple con CA-01, CA-02 y RN-02.
 */
export function mapSpeciesToAnimalModel(item: ApiSpeciesResponse): Animal {
  const imageUrl = item.image_url || item.photo_path || undefined;
  const sizeValue = item.size ? String(item.size) : item.size_cm ? `${item.size_cm} cm` : '';
  const longevityValue = item.life_expectancy || item.longevity || '';

  return {
    id: String(item.id),
    nickname: item.common_name,
    commonName: item.common_name,
    scientificName: item.scientific_name,
    imageUrl,
    category: normalizeCategory(item.category),
    zone: item.zone_name || 'Zona General',
    isDiscovered: false, // Fuera de alcance en mobile-003, reservado para mobile-005
    placeholderTint: item.placeholder_tint || '#8A9A5B',
    stats: {
      avgWeight: item.avg_weight || '',
      size: sizeValue,
      lifeExpectancy: longevityValue,
    },
    diet: item.diet || item.diet_description || undefined,
    curiosities: item.curiosities || item.characteristics || undefined,
    funFact: item.fun_fact || undefined,
  };
}

/**
 * Mapea un evento de la API al modelo ZooEvent de UI (camelCase).
 * Cumple con CA-03 y RN-02.
 */
export function mapEventToZooEventModel(item: ApiEventResponse): ZooEvent {
  const title = item.name || item.title || 'Evento en el Zoológico';
  const date = item.date || item.start_date || '';
  const time = item.time || (item.start_time ? `${item.start_time.substring(0, 5)} hrs` : '');
  const location = item.location || 'Nicolás Bravo';
  const description = item.description || '';

  const imageUrls: string[] = [];
  if (item.image_urls && Array.isArray(item.image_urls)) {
    imageUrls.push(...item.image_urls);
  } else if (item.image_path) {
    imageUrls.push(item.image_path);
  }

  return {
    id: String(item.id),
    title,
    date,
    time,
    location,
    description,
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
  };
}

export interface ApiEnclosureAnimal {
  id: number;
  name: string;
  sex?: string | null;
  age?: string | null;
  origin?: string | null;
  longevity?: string | null;
  diet?: string | null;
  reproduction?: string | null;
  characteristics?: string | null;
  photo_path?: string | null;
  stay_status?: string | null;
  can_receive_visits?: boolean | number | null;
  species_id?: number | null;
  species_name?: string | null;
  scientific_name?: string | null;
  species?: {
    id: number;
    common_name: string;
    scientific_name: string;
    category?: string | null;
    distribution?: string | null;
    conservation_status?: string | null;
    habitat?: string | null;
    gestation_period?: string | null;
    size_cm?: number | null;
    model_3d_path?: string | null;
  } | null;
}

export interface ApiEnclosureResponse {
  id: number | string;
  name: string;
  gps_lat?: number | null;
  gps_lon?: number | null;
  map_x?: number | null;
  map_y?: number | null;
  animals_count?: number;
  animals?: ApiEnclosureAnimal[];
}

/**
 * Mapea un recinto de la API al modelo MapPlace de UI (camelCase).
 * Cumple con CA-21 y RN-20.
 */
export function mapEnclosureToMapPlace(item: ApiEnclosureResponse): MapPlace {
  let mapX = 0.5;
  let mapY = 0.5;

  if (item.map_x != null && item.map_y != null) {
    mapX = Number(item.map_x);
    mapY = Number(item.map_y);
  } else if (item.gps_lat != null && item.gps_lon != null) {
    const { svgX, svgY } = geoTransform(Number(item.gps_lat), Number(item.gps_lon));
    mapX = svgX / SVG_WIDTH;
    mapY = svgY / SVG_HEIGHT;
  }

  const animalsList = Array.isArray(item.animals) && item.animals.length > 0
    ? item.animals.map((a) => a.name || a.species_name).filter(Boolean).join(', ')
    : '';

  const description = animalsList
    ? `Habitan: ${animalsList}.`
    : `Recinto de ${item.name}.`;

  const animals = Array.isArray(item.animals)
    ? item.animals.map((a) => {
        const scientificName = a.scientific_name || a.species?.scientific_name || undefined;
        const speciesName = a.species_name || a.species?.common_name || undefined;
        return {
          id: String(a.id),
          name: a.name,
          speciesName,
          scientificName,
          sex: a.sex ?? undefined,
          age: a.age ?? undefined,
          origin: a.origin ?? undefined,
          longevity: a.longevity ?? undefined,
          diet: a.diet ?? undefined,
          reproduction: a.reproduction ?? undefined,
          veterinaryStatus: a.stay_status ? `Estatus: ${a.stay_status}` : undefined,
          characteristics: a.characteristics ?? undefined,
          funFact: a.characteristics ?? undefined,
          photoPath: a.photo_path ?? undefined,
        };
      })
    : undefined;

  const gpsLat = item.gps_lat != null
    ? Number(item.gps_lat)
    : Math.round((ZOO_BOUNDS.latMax - mapY * (ZOO_BOUNDS.latMax - ZOO_BOUNDS.latMin)) * 1000000) / 1000000;
  const gpsLon = item.gps_lon != null
    ? Number(item.gps_lon)
    : Math.round((ZOO_BOUNDS.lonMin + mapX * (ZOO_BOUNDS.lonMax - ZOO_BOUNDS.lonMin)) * 1000000) / 1000000;

  return {
    id: String(item.id),
    name: item.name,
    kind: 'animal',
    sectionId: `enclosure-${item.id}`,
    description,
    mapX,
    mapY,
    visible: true,
    gpsLat,
    gpsLon,
    animals,
  };
}
