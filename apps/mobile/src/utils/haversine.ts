const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calcula la distancia geodésica en metros entre dos puntos geográficos (latitud/longitud)
 * utilizando la fórmula del semiverseno (Haversine).
 *
 * @param lat1 Latitud del punto origen en grados decimales.
 * @param lon1 Longitud del punto origen en grados decimales.
 * @param lat2 Latitud del punto destino en grados decimales.
 * @param lon2 Longitud del punto destino en grados decimales.
 * @returns Distancia en metros entre ambos puntos.
 */
export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}
