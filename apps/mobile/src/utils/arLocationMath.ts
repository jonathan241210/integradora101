import { haversineMeters } from './haversine';
import { computeRelativeAngleDegrees } from './arMath';

export const AR_FOV_DEGREES = 70;
export const AR_MAX_RANGE_METERS = 120;
export const AR_MIN_RANGE_METERS = 3;
export const AR_MAX_VISIBLE_POINTS = 8;
export const AR_LABEL_MAX_METERS = 50;

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export interface ArLocationTarget {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  kind?: 'enclosure' | 'zoo_place';
  sourceId?: string;
  placeType?: string;
  description?: string | null;
}

export interface ArLocationPoint extends ArLocationTarget {
  distanceMeters: number;
  bearingDegrees: number;
  relativeBearingDegrees: number;
  showLabel: boolean;
}

export interface ArLocationSelectionOptions {
  fovDegrees?: number;
  maxRangeMeters?: number;
  minRangeMeters?: number;
  maxVisiblePoints?: number;
  labelMaxMeters?: number;
  previouslyVisibleIds?: Set<string>;
  hysteresisDegrees?: number;
  hysteresisMeters?: number;
}

export function isValidGeoCoordinate(
  latitude: unknown,
  longitude: unknown,
): latitude is number {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function computeGpsBearingDegrees(from: GeoCoordinate, to: GeoCoordinate): number {
  const fromLat = (from.latitude * Math.PI) / 180;
  const toLat = (to.latitude * Math.PI) / 180;
  const deltaLon = ((to.longitude - from.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function isWithinFov(
  relativeBearingDegrees: number,
  fovDegrees: number = AR_FOV_DEGREES,
): boolean {
  const halfFov = Math.max(0, fovDegrees) / 2;
  return Math.abs(relativeBearingDegrees) <= halfFov;
}

export function getArPointPriority(point: Pick<ArLocationPoint, 'distanceMeters' | 'relativeBearingDegrees'>): number {
  const distanceScore = point.distanceMeters;
  const centerScore = Math.abs(point.relativeBearingDegrees) * 0.75;
  return distanceScore + centerScore;
}

export function selectVisibleArPoints(
  user: GeoCoordinate,
  headingDegrees: number,
  targets: ArLocationTarget[],
  options: ArLocationSelectionOptions = {},
): ArLocationPoint[] {
  const fovDegrees = options.fovDegrees ?? AR_FOV_DEGREES;
  const maxRangeMeters = options.maxRangeMeters ?? AR_MAX_RANGE_METERS;
  const minRangeMeters = options.minRangeMeters ?? AR_MIN_RANGE_METERS;
  const maxVisiblePoints = options.maxVisiblePoints ?? AR_MAX_VISIBLE_POINTS;
  const labelMaxMeters = options.labelMaxMeters ?? AR_LABEL_MAX_METERS;
  const previouslyVisibleIds = options.previouslyVisibleIds ?? new Set<string>();
  const hysteresisDegrees = options.hysteresisDegrees ?? 3;
  const hysteresisMeters = options.hysteresisMeters ?? 5;

  if (!isValidGeoCoordinate(user.latitude, user.longitude) || !Number.isFinite(headingDegrees)) {
    return [];
  }

  const candidates = targets
    .filter((target) => isValidGeoCoordinate(target.latitude, target.longitude))
    .map((target) => {
      const distanceMeters = haversineMeters(
        user.latitude,
        user.longitude,
        target.latitude,
        target.longitude,
      );
      const bearingDegrees = computeGpsBearingDegrees(user, {
        latitude: target.latitude,
        longitude: target.longitude,
      });
      const relativeBearingDegrees = computeRelativeAngleDegrees(bearingDegrees, headingDegrees);

      return {
        ...target,
        distanceMeters,
        bearingDegrees,
        relativeBearingDegrees,
        showLabel: distanceMeters <= labelMaxMeters,
      } satisfies ArLocationPoint;
    })
    .filter((point) => {
      const wasVisible = previouslyVisibleIds.has(point.id);
      const fovLimit = fovDegrees + (wasVisible ? hysteresisDegrees * 2 : 0);
      const maxRange = maxRangeMeters + (wasVisible ? hysteresisMeters : 0);
      const minRange = Math.max(0, minRangeMeters - (wasVisible ? 2 : 0));
      return (
        point.distanceMeters >= minRange &&
        point.distanceMeters <= maxRange &&
        isWithinFov(point.relativeBearingDegrees, fovLimit)
      );
    })
    .sort((a, b) => {
      const priorityDiff = getArPointPriority(a) - getArPointPriority(b);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.distanceMeters !== b.distanceMeters) return a.distanceMeters - b.distanceMeters;
      return Math.abs(a.relativeBearingDegrees) - Math.abs(b.relativeBearingDegrees);
    })
    .slice(0, Math.max(0, maxVisiblePoints));

  if (candidates.length > 0) {
    const mostCentered = candidates.reduce((best, point) =>
      Math.abs(point.relativeBearingDegrees) < Math.abs(best.relativeBearingDegrees) ? point : best,
    );
    return candidates.map((point) =>
      point.id === mostCentered.id ? { ...point, showLabel: true } : point,
    );
  }

  return candidates;
}

export function formatArDistanceMeters(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return '0 m';
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
}