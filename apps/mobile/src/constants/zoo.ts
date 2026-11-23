// Constantes geográficas y de mapa del Zoológico Municipal Nicolás Bravo, Tulancingo.
// Calibración provisional para SVG canónico 1600x1200 (spec 017). Ajustar con medición real.

/** Dimensiones del SVG canónico (viewBox="0 0 1600 1200"). */
export const SVG_WIDTH = 1600;
export const SVG_HEIGHT = 1200;

/**
 * Bounding-box geográfico provisional del zoológico.
 * Derivado del levantamiento DBR-019; requiere validación en campo.
 */
export const ZOO_BOUNDS = {
  latMin: 20.0799,
  latMax: 20.0813,
  lonMin: -98.3624,
  lonMax: -98.3611,
};

/**
 * Posición de la entrada principal en coordenadas SVG canónicas.
 * Centro del elemento id="Inicio" en el SVG canónico.
 */
export const ZOO_ENTRANCE_SVG = { svgX: 523, svgY: 828 };

/**
 * Coordenadas GPS de la entrada principal (Inicio, DBR-019).
 */
export const ZOO_ENTRANCE_GPS = {
  lat: 20.0808334,
  lon: -98.3614225,
};

/** Radio en metros para detectar llegada a un recinto destino (CA-12 / V2.1). */
export const ARRIVAL_RADIUS_METERS = 8;

/** Precisión GPS mínima aceptable en metros. */
export const GPS_ACCURACY_THRESHOLD_METERS = 60;

/** Intervalo mínimo de movimiento en metros para emitir nueva posición GPS. */
export const GPS_DISTANCE_INTERVAL_METERS = 3;

export const ROUTE_LINE_DASH = '8, 6';
export const ROUTE_LINE_WIDTH = 3;

/**
 * Parámetros de zoom, desplazamiento y centrado del visor del mapa.
 */
export const MIN_ZOOM_SCALE = 1.0;
export const MAX_ZOOM_SCALE = 2.5;
export const ZOOM_STEP = 0.5;
export const CENTER_LOCATION_ZOOM = 2.0;
export const MAX_PAN_RANGE = 180;

/**
 * Polígono del contorno del zoológico derivado de la capa "contorno" (layer1) del SVG canónico.
 * Convex hull de los paths del contorno en espacio SVG 1600x1200.
 * Usado para ocultar puntos fuera del zoológico.
 */
export const ZOO_CONTOUR_SVG: Array<[number, number]> = [
  [390.6,664.2],[527.6,151.0],[943.9,0.9],[948.7,9.2],[949.1,10.0],
  [1150.7,424.2],[1154.2,463.0],[1156.9,952.2],[1144.2,954.4],[794.2,994.1],[431.6,860.5],
];

export function isPointInSvgContour(svgX: number, svgY: number, polygon: Array<[number, number]> = ZOO_CONTOUR_SVG): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = yi > svgY !== yj > svgY && svgX < ((xj - xi) * (svgY - yi)) / ((yj - yi) || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
