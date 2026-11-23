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
 * Segmentos del contorno del zoológico extraídos de la capa "contorno" (layer1) del SVG canónico.
 * Se usan con ray-casting (even-odd) para ocultar puntos fuera del zoológico.
 */
export const ZOO_CONTOUR_SEGMENTS: Array<[number, number, number, number]> = [
  [439.9,850.9,707.8,814.3],
  [707.8,814.3,791.6,817.8],
  [791.6,817.8,796.0,832.6],
  [796.0,832.6,720.9,827.4],
  [720.9,827.4,616.2,837.0],
  [616.2,837.0,519.3,853.6],
  [519.3,853.6,462.6,857.1],
  [462.6,857.1,439.0,860.5],
  [780.3,832.6,794.2,994.1],
  [794.2,994.1,1145.1,953.9],
  [1145.1,953.9,1142.5,943.5],
  [1142.5,943.5,804.7,981.9],
  [804.7,981.9,794.2,832.6],
  [1144.2,954.4,1156.9,952.2],
  [1156.9,952.2,1155.1,706.9],
  [1155.1,706.9,1154.7,590.9],
  [1154.7,590.9,1153.4,492.2],
  [1153.4,492.2,1154.2,463.0],
  [1154.2,463.0,1150.7,424.2],
  [1150.7,424.2,1119.3,366.1],
  [1119.3,366.1,1062.6,249.6],
  [1062.6,249.6,1025.5,171.9],
  [1025.5,171.9,992.3,103.4],
  [992.3,103.4,983.2,105.6],
  [983.2,105.6,1066.1,286.3],
  [1066.1,286.3,1130.2,413.7],
  [1130.2,413.7,1143.3,440.3],
  [1143.3,440.3,1148.1,462.6],
  [1148.1,462.6,1145.9,671.2],
  [1145.9,671.2,1147.7,729.6],
  [1147.7,729.6,1147.9,736.7],
  [1147.9,736.7,1148.6,755.8],
  [1148.6,755.8,1149.5,783.4],
  [1149.5,783.4,1150.3,816.2],
  [1150.3,816.2,1151.0,850.9],
  [1151.0,850.9,1151.3,884.0],
  [1151.3,884.0,1151.1,912.2],
  [1151.1,912.2,1150.1,932.1],
  [1150.1,932.1,1145.9,941.6],
  [1145.9,941.6,1144.2,942.5],
  [1144.2,942.5,1142.9,943.2],
  [1142.9,943.2,1142.0,943.7],
  [1142.0,943.7,1141.4,944.0],
  [984.0,106.9,937.8,14.0],
  [937.8,14.0,948.7,9.2],
  [948.7,9.2,992.3,103.9],
  [936.0,16.6,706.5,116.1],
  [706.5,116.1,700.0,106.5],
  [700.0,106.5,943.9,0.9],
  [943.9,0.9,949.1,10.0],
  [701.3,107.4,693.4,96.0],
  [693.4,96.0,631.0,116.1],
  [631.0,116.1,545.5,144.9],
  [545.5,144.9,527.6,151.0],
  [527.6,151.0,604.4,321.6],
  [604.4,321.6,609.6,317.3],
  [609.6,317.3,538.5,158.0],
  [538.5,158.0,687.7,103.9],
  [687.7,103.9,696.0,117.4],
  [696.0,117.4,706.5,114.3],
  [604.4,321.6,564.2,358.7],
  [564.2,358.7,580.4,406.3],
  [580.4,406.3,538.5,447.7],
  [538.5,447.7,454.3,516.7],
  [454.3,516.7,490.1,536.8],
  [490.1,536.8,429.4,625.8],
  [429.4,625.8,439.0,630.1],
  [439.0,630.1,494.9,540.7],
  [494.9,540.7,500.1,533.7],
  [500.1,533.7,469.1,515.4],
  [469.1,515.4,593.5,407.1],
  [593.5,407.1,575.6,359.6],
  [575.6,359.6,617.9,325.1],
  [617.9,325.1,608.8,313.8],
  [429.8,625.3,390.6,664.2],
  [390.6,664.2,426.8,781.1],
  [426.8,781.1,431.6,860.5],
  [426.8,781.1,425.7,777.2],
  [425.7,777.2,422.6,766.8],
  [422.6,766.8,418.2,751.7],
  [418.2,751.7,413.0,733.8],
  [413.0,733.8,407.5,715.0],
  [407.5,715.0,402.2,697.1],
  [402.2,697.1,397.6,682.0],
  [397.6,682.0,394.3,671.6],
  [394.3,671.6,392.4,667.7],
  [391.4,667.7,430.7,628.8],
];

export function isPointInSvgContour(
  svgX: number,
  svgY: number,
  segments: Array<[number, number, number, number]> = ZOO_CONTOUR_SEGMENTS,
): boolean {
  let inside = false;
  for (let i = 0; i < segments.length; i++) {
    const [x1, y1, x2, y2] = segments[i];
    const intersects = y1 > svgY !== y2 > svgY && svgX < ((x2 - x1) * (svgY - y1)) / ((y2 - y1) || 1e-9) + x1;
    if (intersects) inside = !inside;
  }
  return inside;
}
