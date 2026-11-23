import { Animal, MapPlace, News, ZooEvent } from '../models';
import { SVG_HEIGHT, SVG_WIDTH, ZOO_BOUNDS } from '../constants/zoo';
import { geoTransform } from '../utils/geoTransform';
import canonicalMapMapping from '../data/canonicalMapMapping.json';

type CanonicalMapEntry = { suggestedId: string; nameOriginal: string; svgId: string | null; mapX: number | null; mapY: number | null; status: string };
const canonicalEnclosureByName = new Map<string, CanonicalMapEntry>(
  (((canonicalMapMapping as any).enclosures ?? []) as CanonicalMapEntry[]).map((e) => [String(e.nameOriginal).trim().toLowerCase(), e])
);
const canonicalPlaceByName = new Map<string, CanonicalMapEntry>(
  (((canonicalMapMapping as any).zoo_places ?? []) as CanonicalMapEntry[]).map((e) => [String(e.nameOriginal).trim().toLowerCase(), e])
);

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
 * se sirve desde `{origen}/storage/`. Una ruta `species/` se sirve desde `{origen}/media/`.
 * localhost se reescribe al origen de la API.
 */
export function resolveUsableImageUrl(
  imageUrl?: string | null,
  imagePath?: string | null,
  apiBaseUrl: string | null | undefined = process.env.EXPO_PUBLIC_API_URL,
): string | undefined {
  const chosen = absoluteHttp(imageUrl, apiBaseUrl) ?? absoluteHttp(imagePath, apiBaseUrl);
  if (chosen) return chosen;
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

function absoluteHttp(value?: string | null, apiBaseUrl?: string | null): string | undefined {
  const trimmed = value?.trim() ?? '';
  if (!ABSOLUTE_HTTP.test(trimmed)) return undefined;
  return rewriteLoopbackHost(trimmed, apiBaseUrl);
}

function storagePath(value?: string | null): string | undefined {
  const trimmed = value?.trim().replace(/^\/+/, '') ?? '';
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\')) return undefined;
  return /^(news|events|species)\/[^/]+\.(jpg|jpeg|png|webp)$/i.test(trimmed) ? trimmed : undefined;
}

function storagePublicUrl(path: string, apiBaseUrl?: string | null): string | undefined {
  const base = apiBaseUrl?.trim();
  if (!base) return undefined;
  try {
    const folder = path.startsWith('species/') ? 'media' : 'storage';
    return `${new URL(base).origin}/${folder}/${path}`;
  } catch {
    return undefined;
  }
}

function rewriteLoopbackHost(url: string, apiBaseUrl?: string | null): string | undefined {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
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
export function mapSpeciesToAnimalModel(
  item: ApiSpeciesResponse,
  apiBaseUrl?: string,
  publishedImage?: string,
): Animal {
  const imageUrl = resolveUsableImageUrl(item.image_url, item.photo_path, apiBaseUrl) ?? publishedImage;
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
  birth_date?: string | null;
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

function ageFromBirthDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const born = new Date(value);
  if (Number.isNaN(born.getTime())) return undefined;
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  const beforeBirthday = now.getMonth() < born.getMonth()
    || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  if (beforeBirthday) years -= 1;
  if (years < 1) return 'Menos de un año';
  return years === 1 ? '1 año' : `${years} años`;
}

/**
 * Mapea un recinto de la API al modelo MapPlace de UI (camelCase).
 * Cumple con CA-21 y RN-20.
 */
export function mapEnclosureToMapPlace(item: ApiEnclosureResponse): MapPlace {
  const hasMapCoords = item.map_x != null && item.map_y != null;
  const mapX = hasMapCoords ? Number(item.map_x) : 0;
  const mapY = hasMapCoords ? Number(item.map_y) : 0;

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
          age: a.age ?? ageFromBirthDate(a.birth_date) ?? undefined,
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

  const hasRealGps = item.gps_lat != null && item.gps_lon != null;
  const gpsLat = hasRealGps
    ? Number(item.gps_lat)
    : undefined;
  const gpsLon = hasRealGps
    ? Number(item.gps_lon)
    : undefined;

  const canonical = canonicalEnclosureByName.get(String(item.name).trim().toLowerCase());
  const svgId = canonical?.svgId ?? undefined;

  return {
    id: String(item.id),
    name: item.name,
    kind: 'animal',
    sectionId: svgId ?? `enclosure-${item.id}`,
    description,
    mapX,
    mapY,
    visible: hasMapCoords,
    gpsLat,
    gpsLon,
    animals,
    svgId,
  };
}

export interface ApiZooPlaceResponse {
  id: number | string;
  name: string;
  name_original?: string | null;
  place_type: string;
  gps_lat?: number | null;
  gps_lon?: number | null;
  map_x?: number | null;
  map_y?: number | null;
  is_visible?: boolean | number | null;
  description?: string | null;
}

export interface ApiPathNodeResponse {
  id: number | string;
  name?: string | null;
  node_type: string;
  gps_lat?: number | null;
  gps_lon?: number | null;
  map_x?: number | null;
  map_y?: number | null;
}

export function mapZooPlaceToModel(item: ApiZooPlaceResponse) {
  const canonical = canonicalPlaceByName.get(String(item.name_original ?? item.name).trim().toLowerCase());
  const nameKey = String(item.name_original ?? item.name).trim().toLowerCase();
  const isInicio = nameKey === 'inicio';
  const inicioSvg = { mapX: 523 / SVG_WIDTH, mapY: 828 / SVG_HEIGHT, svgId: 'Inicio' };
  return {
    id: String(item.id),
    name: item.name,
    nameOriginal: item.name_original ?? null,
    placeType: item.place_type,
    gpsLat: item.gps_lat != null ? Number(item.gps_lat) : null,
    gpsLon: item.gps_lon != null ? Number(item.gps_lon) : null,
    mapX: isInicio ? inicioSvg.mapX : (item.map_x != null ? Number(item.map_x) : null),
    mapY: isInicio ? inicioSvg.mapY : (item.map_y != null ? Number(item.map_y) : null),
    isVisible: Boolean(item.is_visible ?? true),
    description: item.description ?? null,
    svgId: isInicio ? inicioSvg.svgId : (canonical?.svgId ?? null),
  };
}

export function mapPathNodeToModel(item: ApiPathNodeResponse) {
  return {
    id: String(item.id),
    name: item.name ?? null,
    nodeType: item.node_type,
    gpsLat: item.gps_lat != null ? Number(item.gps_lat) : null,
    gpsLon: item.gps_lon != null ? Number(item.gps_lon) : null,
    mapX: item.map_x != null ? Number(item.map_x) : null,
    mapY: item.map_y != null ? Number(item.map_y) : null,
  };
}
