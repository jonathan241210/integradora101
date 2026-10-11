import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapRoute } from '../../models';
import { Tour3DScreen } from '../../screens/Tour3DScreen';
import { useMapViewModel } from '../../viewmodels/useMapViewModel';

export default function Tour3DRoute() {
  const router = useRouter();
  const { destination: selectedDestination } = useLocalSearchParams<{ destination?: string }>();
  const { getMapData } = useMapViewModel();
  const routeDestination = Array.isArray(selectedDestination) ? selectedDestination[0] : selectedDestination;
  const [destination, setDestination] = useState(routeDestination ?? 'Recorrido del zoológico');

  useEffect(() => {
    let isActive = true;
    if (routeDestination) {
      setDestination(routeDestination);
      return () => { isActive = false; };
    }
    getMapData()
      .then(({ activeRoute }: { activeRoute: MapRoute }) => {
        if (isActive) setDestination(activeRoute.destination);
      })
      .catch((error: unknown) => console.error('Error loading tour data:', error));
    return () => {
      isActive = false;
    };
  }, [getMapData, routeDestination]);

  return (
    <Tour3DScreen
      destination={routeDestination ?? destination}
      onStopPress={() => router.replace('/map')}
      onSwitchToMapPress={() => router.replace('/map')}
      onSearchPress={() => router.push({
        pathname: '/search',
        params: { selectForTour: 'true', returnTo: 'tour-3d', destination },
      })}
    />
  );
}
