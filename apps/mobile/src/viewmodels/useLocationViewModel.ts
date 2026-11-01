import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { geoTransform } from '../utils/geoTransform';
import {
  ZOO_ENTRANCE_SVG,
  GPS_ACCURACY_THRESHOLD_METERS,
  GPS_DISTANCE_INTERVAL_METERS,
} from '../constants/zoo';

export interface UserPosition {
  svgX: number;
  svgY: number;
  lat: number;
  lon: number;
  accuracy: number;
  searching: boolean;
}

export interface LocationViewModel {
  userPosition: UserPosition | null;
  permissionGranted: boolean;
  requestPermission: () => Promise<void>;
}

/**
 * ViewModel que gestiona el ciclo de vida del permiso GPS,
 * la suscripción a expo-location y la posición del usuario.
 *
 * Si el permiso es denegado → permissionGranted=false, userPosition=null.
 * Si accuracy >= GPS_ACCURACY_THRESHOLD_METERS → searching=true, posición en entrada.
 * Si accuracy < GPS_ACCURACY_THRESHOLD_METERS → searching=false, posición real.
 */
export function useLocationViewModel(): LocationViewModel {
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  const handlePosition = useCallback(
    (location: Location.LocationObject) => {
      const { latitude, longitude, accuracy } = location.coords;
      const acc = accuracy ?? GPS_ACCURACY_THRESHOLD_METERS + 1;
      const searching = acc >= GPS_ACCURACY_THRESHOLD_METERS;

      if (searching) {
        setUserPosition({
          ...ZOO_ENTRANCE_SVG,
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
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
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
  }, [handlePosition]);

  // Solicitar permiso al montar
  useEffect(() => {
    void requestPermission();
    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
    };
  }, [requestPermission]);

  return { userPosition, permissionGranted, requestPermission };
}
