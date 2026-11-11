import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { geoTransform } from '../utils/geoTransform';
import {
  ZOO_ENTRANCE_SVG,
  GPS_ACCURACY_THRESHOLD_METERS,
  GPS_DISTANCE_INTERVAL_METERS,
} from '../constants/zoo';

export interface UserPosition {
  /** Coordenada X en el viewBox SVG (0..1000). */
  svgX: number;
  /** Coordenada Y en el viewBox SVG (0..1400). */
  svgY: number;
  /** Latitud GPS real. */
  lat: number;
  /** Longitud GPS real. */
  lon: number;
  /** Precisión reportada por el dispositivo en metros. */
  accuracy: number;
  /** True si la precisión es insuficiente (>20m) y se muestra la posición de entrada. */
  searching: boolean;
  /** Orientación / brújula / giroscopio del dispositivo en grados (0..359). */
  heading?: number | null;
}

export function useLocationViewModel() {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);
  const headingRef = useRef<number | null>(null);

  const handlePosition = useCallback(
    (location: { coords: { latitude: number; longitude: number; accuracy: number | null } }) => {
      const { latitude, longitude, accuracy } = location.coords;
      const acc = accuracy ?? 999;

      if (acc > GPS_ACCURACY_THRESHOLD_METERS) {
        setUserPosition({
          svgX: ZOO_ENTRANCE_SVG.svgX,
          svgY: ZOO_ENTRANCE_SVG.svgY,
          lat: latitude,
          lon: longitude,
          accuracy: acc,
          searching: true,
          heading: headingRef.current,
        });
      } else {
        const { svgX, svgY } = geoTransform(latitude, longitude);
        setUserPosition({
          svgX,
          svgY,
          lat: latitude,
          lon: longitude,
          accuracy: acc,
          searching: false,
          heading: headingRef.current,
        });
      }
    },
    [],
  );

  const handleHeading = useCallback((headingData: { trueHeading?: number; magHeading?: number }) => {
    const rawDeg =
      typeof headingData.trueHeading === 'number' && headingData.trueHeading >= 0
        ? headingData.trueHeading
        : headingData.magHeading;

    if (typeof rawDeg !== 'number' || Number.isNaN(rawDeg)) {
      return;
    }

    const normalized = Math.round(((rawDeg % 360) + 360) % 360);
    headingRef.current = normalized;

    // Solo emitir nuevo estado si el valor cambia para evitar re-renderizados innecesarios
    setHeading((prev) => (prev === normalized ? prev : normalized));
    setUserPosition((prev) => {
      if (!prev) return null;
      if (prev.heading === normalized) return prev;
      return { ...prev, heading: normalized };
    });
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      const granted = Boolean(response?.status === 'granted' || (response as { granted?: boolean })?.granted);
      setPermissionGranted(granted);

      if (granted) {
        const sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: GPS_DISTANCE_INTERVAL_METERS,
          },
          handlePosition,
        );
        subscriptionRef.current = sub;

        if (typeof Location.watchHeadingAsync === 'function') {
          try {
            const headSub = await Location.watchHeadingAsync(handleHeading, () => undefined);
            headingSubRef.current = headSub;
          } catch {
            // Giroscopio o brújula no disponible en este dispositivo
          }
        }
      }
    } catch {
      setPermissionGranted(false);
    }
  }, [handlePosition, handleHeading]);

  // Solicitar permiso al montar
  useEffect(() => {
    void requestPermission();

    return () => {
      subscriptionRef.current?.remove();
      headingSubRef.current?.remove();
    };
  }, [requestPermission]);

  return {
    userPosition,
    heading,
    permissionGranted,
    requestPermission,
  };
}
