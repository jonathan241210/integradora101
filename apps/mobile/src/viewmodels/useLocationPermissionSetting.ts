import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Location from 'expo-location';

type LocationPermission = {
  granted: boolean;
  canAskAgain: boolean;
};

function readPermission(response: { granted?: boolean; status?: string; canAskAgain?: boolean }): LocationPermission {
  return {
    granted: response.granted === true || response.status === 'granted',
    canAskAgain: response.canAskAgain !== false,
  };
}

export function useLocationPermissionSetting() {
  const [permission, setPermission] = useState<LocationPermission | null>(null);

  const refresh = useCallback(async () => {
    try {
      setPermission(readPermission(await Location.getForegroundPermissionsAsync()));
    } catch {
      setPermission({ granted: false, canAskAgain: true });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const onToggle = useCallback(async (enabled: boolean) => {
    if (!enabled || permission?.canAskAgain === false) {
      await Linking.openSettings();
      return;
    }
    try {
      const result = readPermission(await Location.requestForegroundPermissionsAsync());
      setPermission(result);
      if (!result.granted) await Linking.openSettings();
    } catch {
      setPermission({ granted: false, canAskAgain: true });
      await Linking.openSettings();
    }
  }, [permission?.canAskAgain]);

  return {
    granted: permission?.granted === true,
    ready: permission !== null,
    onToggle,
  };
}
