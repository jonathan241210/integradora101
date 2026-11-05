import {
  MAX_PAN_RANGE,
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  SVG_HEIGHT,
  SVG_WIDTH,
} from '../constants/zoo';

export interface PanOffset {
  panX: number;
  panY: number;
}

/**
 * Limita la escala de zoom dentro del rango permitido [MIN_ZOOM_SCALE, MAX_ZOOM_SCALE] (CA-15).
 */
export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) {
    return MIN_ZOOM_SCALE;
  }
  const clamped = Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));
  return Math.round(clamped * 100) / 100;
}

/**
 * Acota el desplazamiento (panX, panY) según el nivel de zoom actual para que el
 * lienzo no salga de los bordes visibles; en escala 1.0 devuelve (0, 0) (CA-16).
 */
export function clampPan(
  panX: number,
  panY: number,
  scale: number,
  baseRange: number = MAX_PAN_RANGE,
): PanOffset {
  const safeScale = clampZoom(scale);
  if (safeScale <= MIN_ZOOM_SCALE) {
    return { panX: 0, panY: 0 };
  }

  const maxOffsetX = Math.round((safeScale - 1) * baseRange);
  const maxOffsetY = Math.round((safeScale - 1) * baseRange * (SVG_HEIGHT / SVG_WIDTH));

  const safePanX = Number.isFinite(panX)
    ? Math.min(maxOffsetX, Math.max(-maxOffsetX, Math.round(panX)))
    : 0;
  const safePanY = Number.isFinite(panY)
    ? Math.min(maxOffsetY, Math.max(-maxOffsetY, Math.round(panY)))
    : 0;

  return {
    panX: safePanX === 0 ? 0 : safePanX,
    panY: safePanY === 0 ? 0 : safePanY,
  };
}

/**
 * Calcula el desplazamiento (panX, panY) necesario para centrar en el visor un punto
 * expresado en coordenadas del viewBox SVG (1000 × 1400), respetando el límite de bordes (CA-17).
 */
export function computeCenterPanForSvgPoint(
  svgX: number,
  svgY: number,
  scale: number,
  baseRange: number = MAX_PAN_RANGE,
): PanOffset {
  const safeScale = clampZoom(scale);
  if (safeScale <= MIN_ZOOM_SCALE) {
    return { panX: 0, panY: 0 };
  }

  // Normalizamos respecto al centro del SVG (0.5, 0.5) → rango [-0.5, +0.5]
  // Como transform aplica scale antes de translate, dividimos el desplazamiento visual entre 2
  // para centrar con exactitud el punto sin pegarlo al borde del límite de pan.
  const normalizedDeltaX = 0.5 - svgX / SVG_WIDTH;
  const normalizedDeltaY = 0.5 - svgY / SVG_HEIGHT;

  const targetPanX = normalizedDeltaX * (safeScale - 1) * baseRange;
  const targetPanY =
    normalizedDeltaY * (safeScale - 1) * baseRange * (SVG_HEIGHT / SVG_WIDTH);

  return clampPan(targetPanX, targetPanY, safeScale, baseRange);
}
