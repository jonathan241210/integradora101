import { haversineMeters } from './haversine';
import { computeGpsBearingDegrees } from './arLocationMath';

export interface GeoAnchorInput {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind: 'enclosure' | 'zoo_place';
}

export interface ArAnchorPoint {
  id: string;
  name: string;
  kind: 'enclosure' | 'zoo_place';
  /** East meters from user origin */
  x: number;
  /** Fixed height for PoC marker */
  y: number;
  /** North maps to -z in many AR coordinate systems */
  z: number;
  distanceMeters: number;
}

/**
 * Convierte coordenadas GPS a coordenadas locales aproximadas para una sesión AR.
 * PoC: origen = posición del usuario al iniciar; no compensa deriva ni calibración fina.
 */
export function geoToArAnchorPoints(
  user: { latitude: number; longitude: number },
  targets: GeoAnchorInput[],
  options: { maxDistanceMeters?: number; maxPoints?: number } = {},
): ArAnchorPoint[] {
  const maxDistanceMeters = options.maxDistanceMeters ?? 120;
  const maxPoints = options.maxPoints ?? 8;

  return targets
    .map((target) => {
      const distanceMeters = haversineMeters(
        user.latitude,
        user.longitude,
        target.latitude,
        target.longitude,
      );
      const bearingDeg = computeGpsBearingDegrees(user, {
        latitude: target.latitude,
        longitude: target.longitude,
      });
      const bearingRad = (bearingDeg * Math.PI) / 180;
      // x = east, z = -north (convención común AR: -z hacia adelante/norte)
      const x = Math.sin(bearingRad) * distanceMeters;
      const z = -Math.cos(bearingRad) * distanceMeters;
      return {
        id: target.id,
        name: target.name,
        kind: target.kind,
        x,
        y: 0,
        z,
        distanceMeters,
      } satisfies ArAnchorPoint;
    })
    .filter((point) => point.distanceMeters <= maxDistanceMeters)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, maxPoints);
}