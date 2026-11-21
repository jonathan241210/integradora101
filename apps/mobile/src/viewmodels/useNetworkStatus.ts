import { useEffect, useState } from 'react';
import { getNetworkStateAsync, useNetworkState, type NetworkState } from 'expo-network';

export interface NetworkStatusViewModel {
  isOffline: boolean;
}

function offlineFrom(state: Pick<NetworkState, 'isConnected' | 'isInternetReachable'>): boolean {
  return state.isConnected === false || state.isInternetReachable === false;
}

/**
 * Expone si el dispositivo está sin conexión (ADR 0014).
 * `isInternetReachable` puede ser `null` mientras se resuelve; solo `false` marca offline.
 * Si el aviso se queda pegado, se vuelve a leer la red cada pocos segundos.
 */
export function useNetworkStatus(): NetworkStatusViewModel {
  const state = useNetworkState();
  const reportedOffline = offlineFrom(state);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    if (!reportedOffline || typeof getNetworkStateAsync !== 'function') {
      setRecovered(false);
      return undefined;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const lookAgain = async () => {
      try {
        const next = await getNetworkStateAsync();
        if (!cancelled) setRecovered(!offlineFrom(next));
      } catch {
        // Conserva el último estado hasta que Expo pueda comprobar la red.
      } finally {
        if (!cancelled) timer = setTimeout(lookAgain, 3000);
      }
    };
    timer = setTimeout(lookAgain, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reportedOffline]);

  return {
    isOffline: reportedOffline && !recovered,
  };
}
