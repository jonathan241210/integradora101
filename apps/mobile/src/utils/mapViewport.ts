import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE, SVG_HEIGHT, SVG_WIDTH } from '../constants/zoo';

export interface MapSize {
  width: number;
  height: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapViewport {
  scale: number;
  panX: number;
  panY: number;
}

export function clampZoom(scale: number): number {
  if (!Number.isFinite(scale)) return MIN_ZOOM_SCALE;
  return Math.min(MAX_ZOOM_SCALE, Math.max(MIN_ZOOM_SCALE, scale));
}

export function fitMap(size: MapSize): MapSize {
  const width = Math.min(size.width, size.height * SVG_WIDTH / SVG_HEIGHT);
  return { width, height: width * SVG_HEIGHT / SVG_WIDTH };
}

export function clampPan(panX: number, panY: number, scale: number, size: MapSize) {
  const content = fitMap(size);
  const limitX = Math.max(0, (content.width * scale - size.width) / 2);
  const limitY = Math.max(0, (content.height * scale - size.height) / 2);
  return {
    panX: limitX ? Math.max(-limitX, Math.min(limitX, panX)) : 0,
    panY: limitY ? Math.max(-limitY, Math.min(limitY, panY)) : 0,
  };
}

export function centerMap(svgX: number, svgY: number, scale: number, size: MapSize): MapViewport {
  const content = fitMap(size);
  return {
    scale,
    ...clampPan(
      (0.5 - svgX / SVG_WIDTH) * content.width * scale,
      (0.5 - svgY / SVG_HEIGHT) * content.height * scale,
      scale,
      size,
    ),
  };
}

export function transformMap(
  initial: MapViewport,
  requestedScale: number,
  start: MapPoint,
  current: MapPoint,
  size: MapSize,
): MapViewport {
  const scale = clampZoom(requestedScale);
  const ratio = scale / initial.scale;
  return {
    scale,
    ...clampPan(
      current.x - (start.x - initial.panX) * ratio,
      current.y - (start.y - initial.panY) * ratio,
      scale,
      size,
    ),
  };
}
