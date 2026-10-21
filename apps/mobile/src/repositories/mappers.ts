import { Animal, ZooEvent } from '../models';

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
