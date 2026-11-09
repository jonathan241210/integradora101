import { SVG_UNIT_TO_METERS } from '../constants/zooPaths';
import { SvgPoint } from './pathfinding';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint2D {
  screenX: number;
  screenY: number;
  scale: number;
  visible: boolean;
}

export interface Chevron3DNode {
  id: string;
  screenX: number;
  screenY: number;
  scale: number;
  angleDegrees: number;
}

export interface PathSegment2D {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
}

export interface ArGuidanceResult {
  targetBearingDegrees: number;
  relativeAngleDegrees: number;
  relativeAngleRadians: number;
  nextStepMeters: number;
  instruction: string;
  projectedSegments: PathSegment2D[];
  projectedChevrons: Chevron3DNode[];
}

export function computeBearingDegrees(from: SvgPoint, to: SvgPoint): number {
  const dx = to.svgX - from.svgX;
  const dy = from.svgY - to.svgY;
  if (dx === 0 && dy === 0) {
    return 0;
  }
  const radians = Math.atan2(dx, dy);
  const degrees = (radians * 180) / Math.PI;
  return (Math.round(degrees * 100) / 100 + 360) % 360;
}

export function computeRelativeAngleDegrees(
  targetBearingDegrees: number,
  currentHeadingDegrees: number,
): number {
  const diff = ((targetBearingDegrees - currentHeadingDegrees + 540) % 360) - 180;
  return diff === -180 ? 180 : Math.round(diff * 100) / 100;
}

export function smoothHeadingDegrees(
  previousHeading: number,
  rawHeading: number,
  alpha: number = 0.25,
): number {
  const clampedAlpha = Math.min(1, Math.max(0.01, alpha));
  const delta = computeRelativeAngleDegrees(rawHeading, previousHeading);
  const next = (previousHeading + clampedAlpha * delta + 360) % 360;
  return Math.round(next * 100) / 100;
}

export function project3DPointToScreen(
  point: Point3D,
  viewportWidth: number = 1000,
  viewportHeight: number = 1400,
  focalLength: number = 680,
): ProjectedPoint2D {
  const safeZ = Math.max(0.4, point.z);
  const scale = focalLength / safeZ;
  const horizonY = viewportHeight * 0.42;

  const screenX = viewportWidth / 2 + point.x * scale;
  const screenY = horizonY - point.y * scale;

  return {
    screenX: Math.round(screenX * 10) / 10,
    screenY: Math.round(screenY * 10) / 10,
    scale: Math.round((scale / focalLength) * 1000) / 1000,
    visible: point.z >= 0.3,
  };
}

export function formatSpanishTurnInstruction(
  relativeAngleDegrees: number,
  nextStepMeters: number,
): string {
  const absAngle = Math.abs(relativeAngleDegrees);
  if (absAngle <= 20) {
    return `Sigue de frente ${nextStepMeters} m por el sendero`;
  }
  if (relativeAngleDegrees > 20 && relativeAngleDegrees <= 65) {
    return `Gira ligeramente a la derecha (${nextStepMeters} m)`;
  }
  if (relativeAngleDegrees > 65 && relativeAngleDegrees <= 135) {
    return `Gira a la derecha en la intersección (${nextStepMeters} m)`;
  }
  if (relativeAngleDegrees < -20 && relativeAngleDegrees >= -65) {
    return `Gira ligeramente a la izquierda (${nextStepMeters} m)`;
  }
  if (relativeAngleDegrees < -65 && relativeAngleDegrees >= -135) {
    return `Gira a la izquierda en la intersección (${nextStepMeters} m)`;
  }
  return `Da media vuelta para retomar el sendero (${nextStepMeters} m)`;
}

export function computeArGuidance(
  userSvg: SvgPoint,
  routePoints: SvgPoint[],
  headingDegrees: number = 0,
  animationPhase: number = 0,
): ArGuidanceResult {
  let nextPoint = routePoints[1] ?? routePoints[0] ?? userSvg;
  for (let i = 1; i < routePoints.length; i += 1) {
    const candidate = routePoints[i];
    const dist = Math.hypot(
      candidate.svgX - userSvg.svgX,
      candidate.svgY - userSvg.svgY,
    );
    if (dist > 5) {
      nextPoint = candidate;
      break;
    }
  }

  const targetBearingDegrees = computeBearingDegrees(userSvg, nextPoint);
  const relativeAngleDegrees = computeRelativeAngleDegrees(
    targetBearingDegrees,
    headingDegrees,
  );
  const relativeAngleRadians = (relativeAngleDegrees * Math.PI) / 180;

  const svgDistToNext = Math.hypot(
    nextPoint.svgX - userSvg.svgX,
    nextPoint.svgY - userSvg.svgY,
  );
  const nextStepMeters = Math.max(1, Math.round(svgDistToNext * SVG_UNIT_TO_METERS));
  const instruction = formatSpanishTurnInstruction(
    relativeAngleDegrees,
    nextStepMeters,
  );

  const maxNodes = Math.min(routePoints.length, 5);
  const projectedNodes: ProjectedPoint2D[] = [];

  projectedNodes.push(
    project3DPointToScreen({ x: 0, y: -1.35, z: 1.1 }),
  );

  const clampedTurnFactor = Math.max(-1.2, Math.min(1.2, relativeAngleRadians));

  for (let i = 1; i < maxNodes; i += 1) {
    const stepDepth = 1.1 + i * 1.15;
    const lateralCurve =
      Math.sin(clampedTurnFactor) * (i * 0.55) +
      ((routePoints[i].svgX - userSvg.svgX) / 450) * (i * 0.25);
    const point3D: Point3D = {
      x: lateralCurve,
      y: -1.35,
      z: stepDepth,
    };
    projectedNodes.push(project3DPointToScreen(point3D));
  }

  if (projectedNodes.length === 1) {
    projectedNodes.push(
      project3DPointToScreen({ x: 0, y: -1.35, z: 2.5 }),
    );
  }

  const projectedSegments: PathSegment2D[] = [];
  for (let i = 1; i < projectedNodes.length; i += 1) {
    const prev = projectedNodes[i - 1];
    const curr = projectedNodes[i];
    projectedSegments.push({
      id: `seg-3d-${i}`,
      x1: prev.screenX,
      y1: prev.screenY,
      x2: curr.screenX,
      y2: curr.screenY,
      strokeWidth: Math.max(6, Math.round(22 - i * 4)),
    });
  }

  const normalizedPhase = ((animationPhase % 1) + 1) % 1;
  const projectedChevrons: Chevron3DNode[] = [];
  const chevronCount = 4;

  for (let c = 0; c < chevronCount; c += 1) {
    const progress = (c / chevronCount + normalizedPhase * 0.25) % 1;
    const zDepth = 1.25 + progress * 2.8;
    const xOffset = Math.sin(clampedTurnFactor) * progress * 1.1;
    const projected = project3DPointToScreen({
      x: xOffset,
      y: -1.3,
      z: zDepth,
    });

    projectedChevrons.push({
      id: `chevron-3d-${c}`,
      screenX: projected.screenX,
      screenY: projected.screenY,
      scale: Math.max(0.45, Math.min(1.3, projected.scale * 1.4)),
      angleDegrees: Math.round(relativeAngleDegrees * 0.45),
    });
  }

  return {
    targetBearingDegrees,
    relativeAngleDegrees,
    relativeAngleRadians,
    nextStepMeters,
    instruction,
    projectedSegments,
    projectedChevrons,
  };
}
