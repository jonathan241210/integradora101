import { MapRepositoryImpl } from '../src/repositories';
import { MOCK_MAP_SECTIONS } from '../src/mocks/zoo';

describe('MapRepository', () => {
  it('test-ca-02: entrega 8 a 10 puntos visibles con coordenadas normalizadas y secciones válidas', async () => {
    const repository = new MapRepositoryImpl();
    const [places, sections] = await Promise.all([
      repository.getPlaces(),
      repository.getSections(),
    ]);

    expect(places.length).toBeGreaterThanOrEqual(8);
    expect(places.length).toBeLessThanOrEqual(10);
    expect(new Set(places.map((place) => place.id)).size).toBe(places.length);

    const sectionIds = new Set(sections.map((section) => section.id));
    for (const place of places) {
      expect(place.visible).toBe(true);
      expect(place.mapX).toBeGreaterThanOrEqual(0);
      expect(place.mapX).toBeLessThanOrEqual(1);
      expect(place.mapY).toBeGreaterThanOrEqual(0);
      expect(place.mapY).toBeLessThanOrEqual(1);
      expect(sectionIds.has(place.sectionId)).toBe(true);
      expect(['animal', 'service', 'entrance']).toContain(place.kind);
    }

    expect(places.some((place) => place.kind === 'animal')).toBe(true);
    expect(places.some((place) => place.kind === 'service')).toBe(true);
    expect(places.some((place) => place.kind === 'entrance')).toBe(true);
  });

  it('test-ca-08: el fixture no contiene rutas ni métricas inventadas', async () => {
    const repository = new MapRepositoryImpl();
    const places = await repository.getPlaces();
    const fields = new Set(places.flatMap((place) => Object.keys(place)));

    expect(fields.has('duration')).toBe(false);
    expect(fields.has('distance')).toBe(false);
    expect(fields.has('direction')).toBe(false);
    expect(fields.has('steps')).toBe(false);
    expect(fields.has('latitude')).toBe(false);
    expect(fields.has('longitude')).toBe(false);
  });

  it('test-ca-08: expone las ocho secciones fijas del SVG', async () => {
    const sections = await new MapRepositoryImpl().getSections();

    expect(sections).toHaveLength(8);
    expect(sections.map((section) => section.id)).toEqual(
      MOCK_MAP_SECTIONS.map((section) => section.id),
    );
    expect(sections.map((section) => section.svgZoneId)).toEqual(
      sections.map((section) => section.id),
    );
    expect(sections.map((section) => section.name)).toEqual([
      'Acceso',
      'Plaza',
      'Felinos',
      'Aves',
      'Acuario',
      'Reptiles',
      'Herbívoros',
      'Servicios',
    ]);
  });
});
