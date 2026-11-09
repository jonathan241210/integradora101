import { MOCK_MAP_PLACES } from '../src/mocks/zoo';
import {
  computeArGuidance,
  computeBearingDegrees,
  computeRelativeAngleDegrees,
  project3DPointToScreen,
  smoothHeadingDegrees,
} from '../src/utils/arMath';
import {
  buildSequentialTour,
  computeTourForks,
} from '../src/utils/tourPlanner';
import { ZOO_ENTRANCE_SVG } from '../src/constants/zoo';

describe('Mobile 009 — Matemática 3D/AR, Bifurcaciones y Recorrido Offline (CA-04, CA-05, CA-06)', () => {
  it('test-ca-05: buildSequentialTour ordena los recintos secuencialmente desde la entrada 100 % offline', () => {
    const tour = buildSequentialTour(MOCK_MAP_PLACES, ZOO_ENTRANCE_SVG);

    // Excluye la entrada como parada y conserva todos los recintos visibles sin duplicados
    expect(tour.length).toBeGreaterThanOrEqual(8);
    expect(tour.some((p) => p.id === 'main-entrance')).toBe(false);
    expect(new Set(tour.map((p) => p.id)).size).toBe(tour.length);
    expect(['monkey', 'food-court', 'elephant', 'restrooms', 'penguin']).toContain(
      tour[0].id,
    );
  });

  it('test-ca-04: computeTourForks detecta las bifurcaciones en el sendero y devuelve ramal principal y desvíos en 3D', () => {
    const tiger = MOCK_MAP_PLACES.find((p) => p.id === 'juan')!;
    const forks = computeTourForks(
      ZOO_ENTRANCE_SVG,
      tiger,
      MOCK_MAP_PLACES,
      0,
    );

    // Debe incluir el ramal principal hacia el Hábitat del Tigre y al menos un desvío secundario en la intersección
    expect(forks.length).toBeGreaterThanOrEqual(2);
    const primary = forks.find((f) => f.isPrimary);
    const secondary = forks.filter((f) => !f.isPrimary);

    expect(primary?.targetPlaceId).toBe('juan');
    expect(primary?.targetPlaceName).toBe('Hábitat del Tigre');
    expect(secondary.length).toBeGreaterThanOrEqual(1);
    expect(secondary[0].targetPlaceId).not.toBe('juan');
    expect(secondary[0].distanceMeters).toBeGreaterThan(0);
    expect(secondary[0].line3D.x1).toBeDefined();
  });

  it('test-ca-06: calcula rumbo, giro relativo, suavizado circular (359° <-> 0°) y proyección 3D', () => {
    // Norte directo (mismo X, menor Y en SVG) -> 0 grados
    expect(computeBearingDegrees({ svgX: 500, svgY: 1000 }, { svgX: 500, svgY: 500 })).toBe(0);
    // Este directo (mayor X, mismo Y) -> 90 grados
    expect(computeBearingDegrees({ svgX: 500, svgY: 500 }, { svgX: 800, svgY: 500 })).toBe(90);

    // Ángulo relativo entre 10° y 350° es +20° (no -340°)
    expect(computeRelativeAngleDegrees(10, 350)).toBe(20);
    expect(computeRelativeAngleDegrees(350, 10)).toBe(-20);

    // Suavizado circular al cruzar de 355° a 5° debe avanzar hacia 357.5° (no promediar a 180°)
    const smoothed = smoothHeadingDegrees(355, 5, 0.25);
    expect(smoothed).toBeCloseTo(357.5, 1);

    const projected = project3DPointToScreen({ x: 0, y: -1.35, z: 2.0 });
    expect(projected.visible).toBe(true);
    expect(projected.screenX).toBe(500);

    const guidance = computeArGuidance(
      { svgX: 500, svgY: 1260 },
      [
        { svgX: 500, svgY: 1260 },
        { svgX: 500, svgY: 1020 },
        { svgX: 420, svgY: 700 },
      ],
      0,
      0.5,
    );
    expect(guidance.instruction).toContain('Sigue de frente');
    expect(guidance.projectedSegments.length).toBeGreaterThanOrEqual(2);
    expect(guidance.projectedChevrons.length).toBe(4);
  });
});
