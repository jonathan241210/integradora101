import {
  computeWalkRoute,
  findNearestPathNode,
  findShortestPath,
} from '../src/utils/pathfinding';
import { ZOO_PATH_EDGES, ZOO_PATH_NODES } from '../src/constants/zooPaths';

describe('Map V3 — Grafo de Senderos Peatonales y Algoritmo Dijkstra (CA-18, CA-19)', () => {
  it('test-ca-18: calcula el camino mínimo sobre el grafo peatonal desde un punto a otro', () => {
    const startNode = findNearestPathNode(523, 828, ZOO_PATH_NODES);
    const targetNode = findNearestPathNode(900, 350, ZOO_PATH_NODES);

    expect(startNode).not.toBeNull();
    expect(targetNode).not.toBeNull();

    const path = findShortestPath(startNode!.id, targetNode!.id, ZOO_PATH_NODES, ZOO_PATH_EDGES);
    const ids = path.map((n) => n.id);

    expect(ids.length).toBeGreaterThan(1);
    expect(ids[0]).toBe(startNode!.id);
    expect(ids[ids.length - 1]).toBe(targetNode!.id);
  });

  it('test-ca-18-disconnected: maneja de forma segura nodos aislados o inexistentes sin lanzar excepciones', () => {
    const customNodes = [
      { id: 'n1', svgX: 100, svgY: 100 },
      { id: 'n2', svgX: 200, svgY: 200 },
      { id: 'isolated', svgX: 800, svgY: 800 },
    ];
    const customEdges = [{ from: 'n1', to: 'n2' }];

    expect(findShortestPath('n1', 'isolated', customNodes, customEdges)).toEqual([]);
    expect(findShortestPath('unknown', 'n1', customNodes, customEdges)).toEqual([]);
    expect(findNearestPathNode(100, 100, [])).toBeNull();

    const fallbackRoute = computeWalkRoute(
      { svgX: 100, svgY: 100 },
      { svgX: 800, svgY: 800 },
      customNodes,
      customEdges,
    );
    expect(fallbackRoute.points.length).toBeGreaterThanOrEqual(2);
    expect(fallbackRoute.distanceMeters).toBeGreaterThanOrEqual(1);
    expect(fallbackRoute.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });

  it('test-ca-19: calcula la distancia en metros y los minutos estimados a pie a 1.1 m/s', () => {
    const route = computeWalkRoute(
      { svgX: 523, svgY: 828 },
      { svgX: 900, svgY: 350 },
    );

    expect(route.points.length).toBeGreaterThan(2);
    expect(route.svgPointsString).toContain('523,828');
    expect(route.svgPointsString).toContain('900,350');
    expect(route.distanceMeters).toBeGreaterThan(1);
    expect(route.estimatedMinutes).toBeGreaterThanOrEqual(1);

    const shortRoute = computeWalkRoute(
      { svgX: 523, svgY: 828 },
      { svgX: 530, svgY: 835 },
    );
    expect(shortRoute.distanceMeters).toBeLessThan(route.distanceMeters);
    expect(shortRoute.estimatedMinutes).toBeGreaterThanOrEqual(1);
  });

  it('test-ca-06: usa fallback temporal de ruteo cuando no existe red path_edges por BD', () => {
    const route = computeWalkRoute(
      { svgX: 523, svgY: 828 },
      { svgX: 900, svgY: 350 },
    );

    expect(route.points.length).toBeGreaterThan(2);
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.estimatedMinutes).toBeGreaterThanOrEqual(1);

    const invalid = computeWalkRoute(
      { svgX: 523, svgY: 828 },
      { svgX: 900, svgY: 350 },
      [],
      [],
    );
    expect(invalid.points.length).toBeGreaterThanOrEqual(2);
    expect(invalid.distanceMeters).toBeGreaterThanOrEqual(1);
  });
});
