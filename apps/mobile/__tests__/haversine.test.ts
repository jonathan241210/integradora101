import { haversineMeters } from '../src/utils/haversine';
import { ARRIVAL_RADIUS_METERS, ZOO_ENTRANCE_GPS } from '../src/constants/zoo';

describe('haversineMeters (CA-12)', () => {
  it('devuelve 0 metros cuando los dos puntos son idénticos', () => {
    const distance = haversineMeters(
      ZOO_ENTRANCE_GPS.lat,
      ZOO_ENTRANCE_GPS.lon,
      ZOO_ENTRANCE_GPS.lat,
      ZOO_ENTRANCE_GPS.lon
    );
    expect(distance).toBe(0);
  });

  it('calcula correctamente la distancia entre dos puntos cercanos (~5 metros)', () => {
    // 0.000045 grados de latitud corresponden a aprox. 5 metros
    const lat1 = 20.08000;
    const lon1 = -98.72200;
    const lat2 = 20.080045;
    const lon2 = -98.72200;

    const distance = haversineMeters(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(4);
    expect(distance).toBeLessThan(6);
    expect(distance <= ARRIVAL_RADIUS_METERS).toBe(true);
  });

  it('detecta cuando un punto está fuera del radio de llegada (> 10 m)', () => {
    // 0.00015 grados de latitud corresponden a aprox. 16.6 metros
    const lat1 = 20.0800;
    const lon1 = -98.7220;
    const lat2 = 20.08015;
    const lon2 = -98.7220;

    const distance = haversineMeters(lat1, lon1, lat2, lon2);
    expect(distance).toBeGreaterThan(ARRIVAL_RADIUS_METERS);
    expect(distance <= ARRIVAL_RADIUS_METERS).toBe(false);
  });

  it('es simétrico: distancia de A a B es igual a distancia de B a A', () => {
    const latA = 20.0838;
    const lonA = -98.7236;
    const latB = 20.0809;
    const lonB = -98.7231;

    const distAB = haversineMeters(latA, lonA, latB, lonB);
    const distBA = haversineMeters(latB, lonB, latA, lonA);

    expect(Math.abs(distAB - distBA)).toBeLessThan(0.0001);
  });
});
