import { useNetworkState } from 'expo-network';

export interface NetworkStatusViewModel {
  isOffline: boolean;
}

/**
 * Expone si el dispositivo está sin conexión (ADR 0014).
 * `isInternetReachable` puede ser `null` mientras se resuelve; solo `false` marca offline.
 */
export function useNetworkStatus(): NetworkStatusViewModel {
  const state = useNetworkState();

  return {
    isOffline: state.isConnected === false || state.isInternetReachable === false,
  };
}
