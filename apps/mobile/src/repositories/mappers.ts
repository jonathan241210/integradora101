import { Animal, MapPlace, News, ZooEvent } from '../models';
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
  image_url?: string | null;
  image_urls?: string[] | null;
}

export interface ApiNewsResponse {
  id?: number | string;
  title?: string;
  titulo?: string;
  description?: string;
  body?: string;
  descripcion?: string;
  content?: string;
  category?: string | null;
  published_date?: string | null;
  date?: string | null;
  image_url?: string | null;
  image_path?: string | null;
}

const ABSOLUTE_HTTP = /^https?:\/\//i;
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Elige una URL que el teléfono pueda abrir.
 * Cumple CA-10 y RN-08: http(s) primero. Una ruta `news/` o `events/`
 * se sirve desde `{origen}/storage/`. localhost se reescribe al origen de la API.
 */
export function resolveUsableImageUrl(
  imageUrl?: string | null,
  imagePath?: string | null,
  apiBaseUrl: string | null | undefined = process.env.EXPO_PUBLIC_API_URL,
): string | undefined {
  const chosen = absoluteHttp(imageUrl) ?? absoluteHttp(imagePath);
  if (chosen) return rewriteLoopbackHost(chosen, apiBaseUrl);
  const stored = storagePath(imageUrl) ?? storagePath(imagePath);
  return stored ? storagePublicUrl(stored, apiBaseUrl) : undefined;
}

export function usableImageList(
  item: { image_url?: string | null; image_path?: string | null; image_urls?: string[] | null },
  apiBaseUrl?: string | null,
): string[] {
  const primary = resolveUsableImageUrl(item.image_url, null, apiBaseUrl);
  if (primary) return [primary];
  const fromList = (item.image_urls ?? [])
    .map((value) => resolveUsableImageUrl(value, null, apiBaseUrl))
    .filter((value): value is string => Boolean(value));
  if (fromList.length > 0) return fromList;
  const fromPath = resolveUsableImageUrl(null, item.image_path, apiBaseUrl);
  return fromPath ? [fromPath] : [];
}

function absoluteHttp(value?: string | null): string | undefined {
  const trimmed = value?.trim() ?? '';
  return ABSOLUTE_HTTP.test(trimmed) ? trimmed : undefined;
}

function storagePath(value?: string | null): string | undefined {
  const trimmed = value?.trim().replace(/^\/+/, '') ?? '';
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\')) return undefined;
  return /^(news|events)\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(trimmed) ? trimmed : undefined;
}

function storagePublicUrl(path: string, apiBaseUrl?: string | null): string | undefined {
  const base = apiBaseUrl?.trim();
  if (!base) return undefined;
  try {
    return `${new URL(base).origin}/storage/${path}`;
  } catch {
    return undefined;
  }
}

function rewriteLoopbackHost(url: string, apiBaseUrl?: string | null): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') return url;
  const base = apiBaseUrl?.trim();
  if (!base) return url;
  try {
    const origin = new URL(base).origin;
    return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

export function formatPublishedDate(value?: string | null): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value?.trim() ?? '');
  if (!match) return value?.trim() || undefined;
  const month = MONTHS_ES[Number(match[2]) - 1];
  if (!month) return value?.trim() || undefined;
  return `${Number(match[3])} de ${month} de ${match[1]}`;
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
  const imageUrl = resolveUsableImageUrl(item.image_url, item.photo_path);
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

  const imageUrls = usableImageList(item);

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

/**
 * Mapea una noticia pública al modelo de UI.
 * Cumple CA-08, CA-09 y CA-10.
 */
export function mapNewsToModel(item: ApiNewsResponse): News {
  const imageUrl = resolveUsableImageUrl(item.image_url, item.image_path);
  return {
    id: item.id != null && String(item.id).trim() !== '' ? String(item.id) : undefined,
    title: item.title || item.titulo || 'Noticia',
    body: item.description || item.body || item.descripcion || '',
    date: formatPublishedDate(item.published_date || item.date),
    category: item.category || undefined,
    imageUrl,
    content: item.content?.trim() ? item.content : undefined,
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
