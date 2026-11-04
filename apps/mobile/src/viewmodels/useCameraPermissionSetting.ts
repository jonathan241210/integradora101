import { useCallback } from 'react';
import { Linking } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

export function useCameraPermissionSetting() {
  const [permission, requestPermission] = useCameraPermissions();

  const onToggle = useCallback(async (enabled: boolean) => {
    if (!enabled || permission?.canAskAgain === false) {
      await Linking.openSettings();
      return;
    }
    const result = await requestPermission();
    if (!result.granted) {
      await Linking.openSettings();
    }
  }, [permission?.canAskAgain, requestPermission]);

  return {
    granted: permission?.granted === true,
    ready: permission !== null,
    onToggle,
  };
}
