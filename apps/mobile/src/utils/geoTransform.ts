import {
  ZOO_BOUNDS,
  ZOO_ENTRANCE_SVG,
  SVG_WIDTH,
  SVG_HEIGHT,
} from '../constants/zoo';

/**
 * Transforma coordenadas GPS reales a coordenadas SVG del mapa esquemático.
 *
 * Usa una transformación afín de bounding-box sobre ZOO_BOUNDS.
 * Si las coordenadas caen fuera del polígono del zoológico, devuelve
 * ZOO_ENTRANCE_SVG como posición segura por defecto.
 *
 * @param lat Latitud GPS del visitante.
 * @param lon Longitud GPS del visitante.
 * @returns Coordenadas { svgX, svgY } dentro del viewBox "0 0 1000 1400".
 */
export function geoTransform(
  lat: number,
  lon: number,
): { svgX: number; svgY: number } {
  const { latMin, latMax, lonMin, lonMax } = ZOO_BOUNDS;

  const inBounds =
    lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax;

  if (!inBounds) {
    return { ...ZOO_ENTRANCE_SVG };
  }

  const svgX = ((lon - lonMin) / (lonMax - lonMin)) * SVG_WIDTH;
  // Y está invertido: latMax (norte) → svgY=0; latMin (sur) → svgY=SVG_HEIGHT
  const svgY = ((latMax - lat) / (latMax - latMin)) * SVG_HEIGHT;

  return { svgX, svgY };
}
