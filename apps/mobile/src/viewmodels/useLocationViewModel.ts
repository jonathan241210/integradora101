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
}

export function useLocationViewModel() {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

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
        });
      }
    },
    [],
  );

  const requestPermission = useCallback(async () => {
    try {
      const response = await Location.requestForegroundPermissionsAsync();
      const granted = response?.status === 'granted';
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
      }
    } catch {
      setPermissionGranted(false);
    }
  }, [handlePosition]);

  // Solicitar permiso al montar
  useEffect(() => {
    void requestPermission();

    return () => {
      subscriptionRef.current?.remove();
    };
  }, [requestPermission]);

  return {
    userPosition,
    permissionGranted,
    requestPermission,
  };
}
