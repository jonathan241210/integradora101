import {
  PathEdge,
  PathNode,
  SVG_UNIT_TO_METERS,
  WALKING_SPEED_MPS,
  ZOO_PATH_EDGES,
  ZOO_PATH_NODES,
} from '../constants/zooPaths';

export interface SvgPoint {
  svgX: number;
  svgY: number;
}

export interface WalkRouteResult {
  /** Lista ordenada de puntos SVG desde la posición del visitante hasta el destino. */
  points: SvgPoint[];
  /** Cadena formateada "x1,y1 x2,y2 ..." lista para <Polyline points={...} />. */
  svgPointsString: string;
  /** Distancia estimada por sendero en metros (entero >= 1) (CA-19). */
  distanceMeters: number;
  /** Tiempo estimado de caminata en minutos a 1.1 m/s (entero >= 1) (CA-19). */
  estimatedMinutes: number;
}

function euclideanDistance(a: SvgPoint, b: SvgPoint): number {
  const dx = a.svgX - b.svgX;
  const dy = a.svgY - b.svgY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Encuentra el nodo de andador peatonal más cercano a una coordenada SVG dada (CA-18).
 */
export function findNearestPathNode(
  svgX: number,
  svgY: number,
  nodes: PathNode[] = ZOO_PATH_NODES,
): PathNode | null {
  if (nodes.length === 0) {
    return null;
  }

  let nearest = nodes[0];
  let minDistance = euclideanDistance({ svgX, svgY }, nearest);

  for (let i = 1; i < nodes.length; i += 1) {
    const candidate = nodes[i];
    const dist = euclideanDistance({ svgX, svgY }, candidate);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = candidate;
    }
  }

  return nearest;
}

/**
 * Calcula el camino más corto entre dos nodos del grafo peatonal usando el algoritmo de Dijkstra (CA-18).
 * Si no existe camino entre los nodos (grafo desconectado), devuelve un arreglo vacío.
 */
export function findShortestPath(
  startNodeId: string,
  endNodeId: string,
  nodes: PathNode[] = ZOO_PATH_NODES,
  edges: PathEdge[] = ZOO_PATH_EDGES,
): PathNode[] {
  const nodeMap = new Map<string, PathNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  if (!nodeMap.has(startNodeId) || !nodeMap.has(endNodeId)) {
    return [];
  }

  if (startNodeId === endNodeId) {
    return [nodeMap.get(startNodeId)!];
  }

  // Construir lista de adyacencia ponderada por distancia euclidiana en el SVG
  const adjacency = new Map<string, { neighborId: string; weight: number }[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) {
      continue;
    }
    const weight = euclideanDistance(fromNode, toNode);
    adjacency.get(edge.from)?.push({ neighborId: edge.to, weight });
    adjacency.get(edge.to)?.push({ neighborId: edge.from, weight });
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();

  for (const node of nodes) {
    distances.set(node.id, Infinity);
    previous.set(node.id, null);
    unvisited.add(node.id);
  }
  distances.set(startNodeId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let smallestDistance = Infinity;

    for (const nodeId of unvisited) {
      const d = distances.get(nodeId) ?? Infinity;
      if (d < smallestDistance) {
        smallestDistance = d;
        currentId = nodeId;
      }
    }

    if (currentId === null || smallestDistance === Infinity) {
      break;
    }

    if (currentId === endNodeId) {
      break;
    }

    unvisited.delete(currentId);

    const neighbors = adjacency.get(currentId) ?? [];
    for (const { neighborId, weight } of neighbors) {
      if (!unvisited.has(neighborId)) {
        continue;
      }
      const alt = smallestDistance + weight;
      if (alt < (distances.get(neighborId) ?? Infinity)) {
        distances.set(neighborId, alt);
        previous.set(neighborId, currentId);
      }
    }
  }

  if ((distances.get(endNodeId) ?? Infinity) === Infinity) {
    return [];
  }

  const path: PathNode[] = [];
  let step: string | null = endNodeId;
  while (step !== null) {
    const node = nodeMap.get(step);
    if (node) {
      path.unshift(node);
    }
    step = previous.get(step) ?? null;
  }

  return path;
}

/**
 * Calcula la ruta peatonal completa entre la posición actual del visitante y el recinto destino,
 * incluyendo los puntos de la polilínea SVG, la distancia en metros y el tiempo estimado a pie (CA-18, CA-19).
 */
export function computeWalkRoute(
  start: SvgPoint,
  destination: SvgPoint,
  nodes: PathNode[] = ZOO_PATH_NODES,
  edges: PathEdge[] = ZOO_PATH_EDGES,
): WalkRouteResult {
  const startNode = findNearestPathNode(start.svgX, start.svgY, nodes);
  const endNode = findNearestPathNode(destination.svgX, destination.svgY, nodes);

  let points: SvgPoint[];

  if (startNode && endNode) {
    const graphNodes = findShortestPath(startNode.id, endNode.id, nodes, edges);
    if (graphNodes.length > 0) {
      points = [
        { svgX: Math.round(start.svgX), svgY: Math.round(start.svgY) },
        ...graphNodes.map((n) => ({ svgX: n.svgX, svgY: n.svgY })),
        { svgX: Math.round(destination.svgX), svgY: Math.round(destination.svgY) },
      ];
    } else {
      points = [
        { svgX: Math.round(start.svgX), svgY: Math.round(start.svgY) },
        { svgX: Math.round(destination.svgX), svgY: Math.round(destination.svgY) },
      ];
    }
  } else {
    points = [
      { svgX: Math.round(start.svgX), svgY: Math.round(start.svgY) },
      { svgX: Math.round(destination.svgX), svgY: Math.round(destination.svgY) },
    ];
  }

  // Eliminar puntos consecutivos duplicados para limpiar la polilínea SVG
  const deduplicatedPoints: SvgPoint[] = [];
  for (const pt of points) {
    const prev = deduplicatedPoints[deduplicatedPoints.length - 1];
    if (!prev || prev.svgX !== pt.svgX || prev.svgY !== pt.svgY) {
      deduplicatedPoints.push(pt);
    }
  }
  if (deduplicatedPoints.length === 1) {
    deduplicatedPoints.push({ ...deduplicatedPoints[0] });
  }

  let totalSvgUnits = 0;
  for (let i = 1; i < deduplicatedPoints.length; i += 1) {
    totalSvgUnits += euclideanDistance(deduplicatedPoints[i - 1], deduplicatedPoints[i]);
  }

  const rawMeters = totalSvgUnits * SVG_UNIT_TO_METERS;
  const distanceMeters = Math.max(1, Math.round(rawMeters));
  const estimatedMinutes = Math.max(
    1,
    Math.ceil(distanceMeters / (WALKING_SPEED_MPS * 60)),
  );

  const svgPointsString = deduplicatedPoints
    .map((p) => `${p.svgX},${p.svgY}`)
    .join(' ');

  return {
    points: deduplicatedPoints,
    svgPointsString,
    distanceMeters,
    estimatedMinutes,
  };
}
