// Constantes geográficas del Zoológico Municipal Nicolás Bravo, Tulancingo.
// TODO: reemplazar ZOO_BOUNDS y ZOO_ENTRANCE_GPS con medición real en campo.

/** Dimensiones del SVG esquemático (viewBox="0 0 1000 1400"). */
export const SVG_WIDTH = 1000;
export const SVG_HEIGHT = 1400;

/**
 * Bounding-box geográfico del zoológico (valores SINTÉTICOS de prueba).
 * Reemplazar con las coordenadas GPS reales de las 4 esquinas del polígono
 * del Zoológico Nicolás Bravo cuando se realice la medición en campo.
 */
export const ZOO_BOUNDS = {
  latMin: 20.0800, // esquina suroeste (prueba)
  latMax: 20.0850, // esquina noreste (prueba)
  lonMin: -98.7250, // esquina oeste (prueba)
  lonMax: -98.7190, // esquina este (prueba)
};

/**
 * Posición de la entrada principal en coordenadas SVG (prueba).
 * Se usa como punto de partida cuando el GPS no tiene señal suficiente.
 */
export const ZOO_ENTRANCE_SVG = { svgX: 500, svgY: 1320 };

/**
 * Coordenadas GPS de la entrada principal (prueba).
 * TODO: reemplazar con medición real.
 */
export const ZOO_ENTRANCE_GPS = {
  lat: 20.0800,
  lon: -98.7220,
};

/** Radio en metros para detectar llegada a un recinto destino (CA-12 / V2.1). */
export const ARRIVAL_RADIUS_METERS = 10;

/** Precisión GPS mínima aceptable en metros. Sobre este valor → modo "buscando". */
export const GPS_ACCURACY_THRESHOLD_METERS = 20;

/** Intervalo mínimo de movimiento en metros para emitir nueva posición GPS. */
export const GPS_DISTANCE_INTERVAL_METERS = 3;

/**
 * Colores del punto azul de ubicación (estándar de mapas).
 * Cuando los tokens semánticos tengan un token de ubicación se reemplazarán.
 */
export const LOCATION_DOT_COLOR = 'hsl(217, 89%, 61%)';
export const LOCATION_DOT_BORDER = 'hsl(0, 0%, 100%)';
export const LOCATION_PULSE_COLOR = 'hsla(217, 89%, 61%, 0.25)';
export const LOCATION_DOT_SHADOW = 'hsl(0, 0%, 0%)';
