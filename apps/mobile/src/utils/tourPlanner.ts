import { MapPlace } from '../models';
import { SVG_HEIGHT, SVG_WIDTH, ZOO_ENTRANCE_SVG } from '../constants/zoo';
import {
  PathEdge,
  PathNode,
  ZOO_PATH_EDGES,
  ZOO_PATH_NODES,
} from '../constants/zooPaths';
import {
  computeBearingDegrees,
  computeRelativeAngleDegrees,
  project3DPointToScreen,
} from './arMath';
import {
  computeWalkRoute,
  findNearestPathNode,
  SvgPoint,
} from './pathfinding';

export interface TourForkBranch {
  id: string;
  forkNodeId: string;
  neighborNodeId: string;
  isPrimary: boolean;
  targetPlaceId: string;
  targetPlaceName: string;
  distanceMeters: number;
  relativeAngleDegrees: number;
  line3D: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}

export function buildSequentialTour(
  places: MapPlace[],
  startSvg: SvgPoint = ZOO_ENTRANCE_SVG,
): MapPlace[] {
  const candidates = places.filter(
    (place) => place.visible && place.kind !== 'entrance',
  );

  if (candidates.length <= 1) {
    return candidates;
  }

  const remaining = [...candidates];
  const orderedTour: MapPlace[] = [];
  let currentPoint: SvgPoint = { ...startSvg };

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const candidateSvg: SvgPoint = {
        svgX: candidate.mapX * SVG_WIDTH,
        svgY: candidate.mapY * SVG_HEIGHT,
      };
      const route = computeWalkRoute(currentPoint, candidateSvg);
      if (route.distanceMeters < bestDistance) {
        bestDistance = route.distanceMeters;
        bestIndex = i;
      }
    }

    const [chosen] = remaining.splice(bestIndex, 1);
    orderedTour.push(chosen);
    currentPoint = {
      svgX: chosen.mapX * SVG_WIDTH,
      svgY: chosen.mapY * SVG_HEIGHT,
    };
  }

  return orderedTour;
}

export function computeTourForks(
  userSvg: SvgPoint,
  currentTargetPlace: MapPlace | null,
  allPlaces: MapPlace[],
  headingDegrees: number = 0,
  nodes: PathNode[] = ZOO_PATH_NODES,
  edges: PathEdge[] = ZOO_PATH_EDGES,
): TourForkBranch[] {
  if (!currentTargetPlace || nodes.length === 0) {
    return [];
  }

  const destSvg: SvgPoint = {
    svgX: currentTargetPlace.mapX * SVG_WIDTH,
    svgY: currentTargetPlace.mapY * SVG_HEIGHT,
  };

  const mainRoute = computeWalkRoute(userSvg, destSvg, nodes, edges);

  const nodeMap = new Map<string, PathNode>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const routeNodes: PathNode[] = [];
  for (const pt of mainRoute.points) {
    const matched = nodes.find(
      (n) => Math.abs(n.svgX - pt.svgX) <= 2 && Math.abs(n.svgY - pt.svgY) <= 2,
    );
    if (matched && !routeNodes.some((r) => r.id === matched.id)) {
      routeNodes.push(matched);
    }
  }

  let forkNode: PathNode | null = null;
  let nextMainNode: PathNode | null = null;
  let prevMainNode: PathNode | null = null;

  for (let i = 0; i < routeNodes.length; i += 1) {
    const candidate = routeNodes[i];
    const neighbors = adjacency.get(candidate.id) ?? [];
    if (neighbors.length >= 3) {
      forkNode = candidate;
      prevMainNode = i > 0 ? routeNodes[i - 1] : null;
      nextMainNode = i + 1 < routeNodes.length ? routeNodes[i + 1] : null;
      break;
    }
  }

  if (!forkNode) {
    const nearest = findNearestPathNode(userSvg.svgX, userSvg.svgY, nodes);
    if (!nearest) {
      return [];
    }
    forkNode = nearest;
  }

  const neighborIds = adjacency.get(forkNode.id) ?? [];
  const visiblePlaces = allPlaces.filter(
    (p) => p.visible && p.kind !== 'entrance',
  );

  const branches: TourForkBranch[] = [];
  const forkAnchor2D = project3DPointToScreen({ x: 0, y: -1.35, z: 2.15 });

  const mainBearing = computeBearingDegrees(
    forkNode,
    nextMainNode ?? destSvg,
  );
  const mainRelAngle = computeRelativeAngleDegrees(mainBearing, headingDegrees);
  const mainEnd2D = project3DPointToScreen({
    x: Math.sin((mainRelAngle * Math.PI) / 180) * 0.9,
    y: -1.35,
    z: 3.4,
  });

  branches.push({
    id: `fork-main-${currentTargetPlace.id}`,
    forkNodeId: forkNode.id,
    neighborNodeId: nextMainNode?.id ?? forkNode.id,
    isPrimary: true,
    targetPlaceId: currentTargetPlace.id,
    targetPlaceName: currentTargetPlace.name,
    distanceMeters: mainRoute.distanceMeters,
    relativeAngleDegrees: mainRelAngle,
    line3D: {
      x1: forkAnchor2D.screenX,
      y1: forkAnchor2D.screenY,
      x2: mainEnd2D.screenX,
      y2: mainEnd2D.screenY,
    },
  });

  let secondaryCount = 0;
  for (const neighborId of neighborIds) {
    if (neighborId === prevMainNode?.id || neighborId === nextMainNode?.id) {
      continue;
    }
    const neighborNode = nodeMap.get(neighborId);
    if (!neighborNode) {
      continue;
    }

    let bestPlace: MapPlace | null = null;
    let bestDist = Infinity;

    for (const place of visiblePlaces) {
      if (place.id === currentTargetPlace.id) {
        continue;
      }
      if (branches.some((b) => b.targetPlaceId === place.id)) {
        continue;
      }
      const d = Math.hypot(
        place.mapX * SVG_WIDTH - neighborNode.svgX,
        place.mapY * SVG_HEIGHT - neighborNode.svgY,
      );
      if (d < bestDist) {
        bestDist = d;
        bestPlace = place;
      }
    }

    if (!bestPlace) {
      continue;
    }

    const branchRoute = computeWalkRoute(
      userSvg,
      {
        svgX: bestPlace.mapX * SVG_WIDTH,
        svgY: bestPlace.mapY * SVG_HEIGHT,
      },
      nodes,
      edges,
    );

    const branchBearing = computeBearingDegrees(forkNode, neighborNode);
    const branchRelAngle = computeRelativeAngleDegrees(
      branchBearing,
      headingDegrees,
    );

    const sideSign =
      branchRelAngle === 0
        ? secondaryCount % 2 === 0
          ? -1
          : 1
        : Math.sign(branchRelAngle);
    const lateralX =
      sideSign * Math.max(0.75, Math.abs(Math.sin((branchRelAngle * Math.PI) / 180)) * 1.45);
    const branchEnd2D = project3DPointToScreen({
      x: lateralX,
      y: -1.35,
      z: 3.1,
    });

    branches.push({
      id: `fork-alt-${bestPlace.id}`,
      forkNodeId: forkNode.id,
      neighborNodeId: neighborId,
      isPrimary: false,
      targetPlaceId: bestPlace.id,
      targetPlaceName: bestPlace.name,
      distanceMeters: branchRoute.distanceMeters,
      relativeAngleDegrees: branchRelAngle,
      line3D: {
        x1: forkAnchor2D.screenX,
        y1: forkAnchor2D.screenY,
        x2: branchEnd2D.screenX,
        y2: branchEnd2D.screenY,
      },
    });

    secondaryCount += 1;
    if (secondaryCount >= 2) {
      break;
    }
  }

  return branches;
}
