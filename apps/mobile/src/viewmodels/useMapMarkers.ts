import { useMemo } from 'react';
import { FOOD_SERVICE_MAP_ANCHOR, FOOD_SERVICE_MAP_ID, SVG_HEIGHT, SVG_WIDTH } from '../constants/zoo';
import type { MapPlace, ZooPlace } from '../models';

const visitorServiceTypes = new Set(['servicios', 'restroom', 'food', 'ticketing']);

export function withCanonicalFoodAnchor(place: MapPlace): MapPlace {
  if (place.id !== FOOD_SERVICE_MAP_ID) return place;
  return { ...place, ...FOOD_SERVICE_MAP_ANCHOR };
}

function hasMapCoordinates(place: ZooPlace): place is ZooPlace & { mapX: number; mapY: number } {
  return place.mapX != null && place.mapX >= 0 && place.mapX <= 1
    && place.mapY != null && place.mapY >= 0 && place.mapY <= 1;
}

export function toZooPlaceMarker(place: ZooPlace): MapPlace | null {
  if (!place.isVisible || !hasMapCoordinates(place)) return null;
  return {
    id: `zoo-place-${place.id}`,
    name: place.name,
    kind: 'zoo_place',
    isVisitorService: visitorServiceTypes.has(place.placeType) || place.svgId === FOOD_SERVICE_MAP_ANCHOR.svgId,
    sectionId: place.svgId ?? `zoo-place-${place.id}`,
    description: place.description || place.placeType,
    mapX: place.mapX,
    mapY: place.mapY,
    visible: true,
    gpsLat: place.gpsLat ?? undefined,
    gpsLon: place.gpsLon ?? undefined,
    svgId: place.svgId ?? undefined,
  };
}

function getMarkerHitWidths(places: MapPlace[]) {
  const maxHitWidth = 0.065;
  const widths = new Map<string, number>();
  for (const place of places) {
    let width = maxHitWidth;
    for (const neighbor of places) {
      if (neighbor === place) continue;
      const horizontalDistance = Math.abs(neighbor.mapX - place.mapX);
      const verticalDistance = Math.abs(neighbor.mapY - place.mapY) * SVG_HEIGHT / SVG_WIDTH;
      // Los botones cuadrados de puntos cercanos no deben invadir el centro del vecino.
      const distance = Math.max(horizontalDistance, verticalDistance);
      if (distance > 0) width = Math.min(width, distance);
    }
    widths.set(place.id, width);
  }
  return widths;
}

export function useMapMarkers(filteredPlaces: MapPlace[], zooPlaces: ZooPlace[]) {
  return useMemo(() => {
    const zooPlaceMarkers = zooPlaces.map(toZooPlaceMarker).filter((place) => place !== null);
    const hasFoodMarker = zooPlaceMarkers.some((place) => place.svgId === FOOD_SERVICE_MAP_ANCHOR.svgId);
    const visiblePlaces = filteredPlaces.filter((place) => {
      if (place.id === FOOD_SERVICE_MAP_ID) return !hasFoodMarker;
      return zooPlaces.length === 0 || (place.id !== 'restrooms' && place.id !== 'main-entrance');
    }).map(withCanonicalFoodAnchor);

    const allMapPins = [...visiblePlaces, ...zooPlaceMarkers];
    return { allMapPins, hitWidths: getMarkerHitWidths(allMapPins) };
  }, [filteredPlaces, zooPlaces]);
}
