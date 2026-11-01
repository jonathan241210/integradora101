import { geoTransform } from '../src/utils/geoTransform';
import {
  ZOO_BOUNDS,
  ZOO_ENTRANCE_SVG,
  SVG_WIDTH,
  SVG_HEIGHT,
} from '../src/constants/zoo';

// CA-11: la función geoTransform convierte GPS → SVG correctamente.

describe('geoTransform', () => {
  const { latMin, latMax, lonMin, lonMax } = ZOO_BOUNDS;

  it('test-ca-11-nw-corner: esquina noroeste → svgX≈0, svgY≈0', () => {
    const result = geoTransform(latMax, lonMin);
    expect(result.svgX).toBeCloseTo(0, 0);
    expect(result.svgY).toBeCloseTo(0, 0);
  });

  it('test-ca-11-se-corner: esquina sureste → svgX≈SVG_WIDTH, svgY≈SVG_HEIGHT', () => {
    const result = geoTransform(latMin, lonMax);
    expect(result.svgX).toBeCloseTo(SVG_WIDTH, 0);
    expect(result.svgY).toBeCloseTo(SVG_HEIGHT, 0);
  });

  it('test-ca-11-center: punto central → coordenadas dentro del rango SVG', () => {
    const midLat = (latMin + latMax) / 2;
    const midLon = (lonMin + lonMax) / 2;
    const result = geoTransform(midLat, midLon);
    expect(result.svgX).toBeGreaterThan(0);
    expect(result.svgX).toBeLessThan(SVG_WIDTH);
    expect(result.svgY).toBeGreaterThan(0);
    expect(result.svgY).toBeLessThan(SVG_HEIGHT);
  });

  it('test-ca-11-out-of-bounds: fuera del zoológico → ZOO_ENTRANCE_SVG', () => {
    // Coordenadas de Ciudad de México (fuera del zoo)
    const result = geoTransform(19.4326, -99.1332);
    expect(result.svgX).toBe(ZOO_ENTRANCE_SVG.svgX);
    expect(result.svgY).toBe(ZOO_ENTRANCE_SVG.svgY);
  });
});
