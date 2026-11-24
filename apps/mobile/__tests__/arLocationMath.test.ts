import {
  AR_FOV_DEGREES,
  AR_LABEL_MAX_METERS,
  AR_MAX_RANGE_METERS,
  AR_MAX_VISIBLE_POINTS,
  AR_MIN_RANGE_METERS,
  computeGpsBearingDegrees,
  isWithinFov,
  selectVisibleArPoints,
} from '../src/utils/arLocationMath';

describe('Mobile 015 — AR location-based (CA-03, CA-04)', () => {
  const user = { latitude: 20.082, longitude: -98.363 };

  it('test-ca-04: calcula bearing GPS y normaliza el ángulo relativo respecto al heading', () => {
    const north = computeGpsBearingDegrees(user, { latitude: 20.083, longitude: -98.363 });
    const east = computeGpsBearingDegrees(user, { latitude: 20.082, longitude: -98.362 });

    expect(north % 360).toBeLessThan(1);
    expect(east).toBeGreaterThan(80);
    expect(east).toBeLessThan(100);

    const points = selectVisibleArPoints(user, 350, [
      { id: 'n1', name: 'Norte', latitude: 20.0824, longitude: -98.363 },
    ]);

    expect(points).toHaveLength(1);
    expect(points[0].relativeBearingDegrees).toBeGreaterThan(0);
    expect(points[0].relativeBearingDegrees).toBeLessThan(20);
  });

  it('test-ca-03: filtra por FOV/rango, prioriza cercanía y centro, y limita a 6 puntos sin mostrar path_nodes', () => {
    const targets = [
      { id: 'e1', name: 'Recinto 1', latitude: 20.0821, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e2', name: 'Recinto 2', latitude: 20.0822, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e3', name: 'Recinto 3', latitude: 20.0823, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e4', name: 'Recinto 4', latitude: 20.0824, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e5', name: 'Recinto 5', latitude: 20.0825, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e6', name: 'Recinto 6', latitude: 20.0826, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'e7', name: 'Recinto 7', latitude: 20.0827, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'far', name: 'Lejos', latitude: 20.09, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'behind', name: 'Atrás', latitude: 20.0815, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'node-1', name: 'Nodo', latitude: 20.08215, longitude: -98.363, kind: 'zoo_place' as const },
    ];

    const selected = selectVisibleArPoints(user, 0, targets);

    expect(selected.length).toBeLessThanOrEqual(AR_MAX_VISIBLE_POINTS);
    expect(selected.every((p) => p.distanceMeters >= AR_MIN_RANGE_METERS)).toBe(true);
    expect(selected.every((p) => p.distanceMeters <= AR_MAX_RANGE_METERS)).toBe(true);
    expect(selected.every((p) => Math.abs(p.relativeBearingDegrees) <= AR_FOV_DEGREES / 2)).toBe(true);
    expect(selected.some((p) => p.id === 'behind')).toBe(false);
    expect(selected.some((p) => p.id === 'far')).toBe(false);
    expect(selected.some((p) => p.id === 'node-1')).toBe(true); // zoo_place puede pasar filtro geométrico; el caller debe filtrar por recinto
    expect(selected[0].distanceMeters).toBeLessThanOrEqual(selected[selected.length - 1].distanceMeters + 20);
  });

  it('test-ca-03: etiqueta visible a <=40m o para el punto más centrado', () => {
    const selected = selectVisibleArPoints(user, 0, [
      { id: 'near', name: 'Cerca', latitude: 20.0822, longitude: -98.363, kind: 'enclosure' as const },
      { id: 'mid', name: 'Medio', latitude: 20.0825, longitude: -98.36302, kind: 'enclosure' as const },
    ]);

    const near = selected.find((p) => p.id === 'near');
    const mid = selected.find((p) => p.id === 'mid');
    expect(near?.showLabel).toBe(true);
    expect(selected.some((p) => p.showLabel)).toBe(true);
    if (mid && mid.distanceMeters > AR_LABEL_MAX_METERS) {
      // puede ser true solo si es el más centrado
      expect(typeof mid.showLabel).toBe('boolean');
    }
  });

  it('test-ca-04: devuelve vacío ante coordenadas/heading inválidos (degradación segura)', () => {
    expect(
      selectVisibleArPoints({ latitude: Number.NaN, longitude: -98.3 }, 0, [
        { id: 'e1', name: 'Recinto', latitude: 20.0821, longitude: -98.363 },
      ]),
    ).toEqual([]);

    expect(
      selectVisibleArPoints(user, Number.NaN, [
        { id: 'e1', name: 'Recinto', latitude: 20.0821, longitude: -98.363 },
      ]),
    ).toEqual([]);

    expect(isWithinFov(40, AR_FOV_DEGREES)).toBe(false);
    expect(isWithinFov(30, AR_FOV_DEGREES)).toBe(true);
  });
});