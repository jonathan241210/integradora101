import {
  computeWalkRoute,
  findNearestPathNode,
  findShortestPath,
} from '../src/utils/pathfinding';
import { PathEdge, PathNode } from '../src/constants/zooPaths';

describe('Map V3 — Grafo de Senderos Peatonales y Algoritmo Dijkstra (CA-18, CA-19)', () => {
  it('test-ca-18: calcula el camino mínimo sobre el grafo peatonal desde la entrada hasta los recintos', () => {
    const startNode = findNearestPathNode(500, 1280);
    const tigerNode = findNearestPathNode(230, 350);

    expect(startNode?.id).toBe('entrance-main');
    expect(tigerNode?.id).toBe('felines-juan');

    const path = findShortestPath('entrance-main', 'felines-juan');
    const ids = path.map((n) => n.id);

    // Debe pasar por el pasillo sur, entrar a la Plaza y desviarse hacia Felinos
    expect(ids[0]).toBe('entrance-main');
    expect(ids).toContain('plaza-south');
    expect(ids).toContain('plaza-nw');
    expect(ids[ids.length - 1]).toBe('felines-juan');
  });

  it('test-ca-18-disconnected: maneja de forma segura nodos aislados o inexistentes sin lanzar excepciones', () => {
    const customNodes: PathNode[] = [
      { id: 'n1', svgX: 100, svgY: 100 },
      { id: 'n2', svgX: 200, svgY: 200 },
      { id: 'isolated', svgX: 800, svgY: 800 },
    ];
    const customEdges: PathEdge[] = [{ from: 'n1', to: 'n2' }];

    expect(findShortestPath('n1', 'isolated', customNodes, customEdges)).toEqual([]);
    expect(findShortestPath('unknown', 'n1', customNodes, customEdges)).toEqual([]);
    expect(findNearestPathNode(100, 100, [])).toBeNull();

    // computeWalkRoute sigue devolviendo un fallback seguro aunque el nodo esté aislado
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
    const routeToTiger = computeWalkRoute(
      { svgX: 500, svgY: 1280 },
      { svgX: 230, svgY: 350 },
    );

    // Debe contener los nodos intermedios de los pasillos (más de 2 puntos)
    expect(routeToTiger.points.length).toBeGreaterThan(4);
    expect(routeToTiger.svgPointsString).toContain('500,1280');
    expect(routeToTiger.svgPointsString).toContain('230,350');
    expect(routeToTiger.distanceMeters).toBeGreaterThan(200);
    expect(routeToTiger.estimatedMinutes).toBeGreaterThanOrEqual(3);

    // Una ruta corta (de entrada a pasillo sur cercano) debe tomar menos distancia y ~1 min
    const shortRoute = computeWalkRoute(
      { svgX: 500, svgY: 1260 },
      { svgX: 500, svgY: 1180 },
    );
    expect(shortRoute.distanceMeters).toBeLessThan(routeToTiger.distanceMeters);
    expect(shortRoute.estimatedMinutes).toBe(1);
  });
});
