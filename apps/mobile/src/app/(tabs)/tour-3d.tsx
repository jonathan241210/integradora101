import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tour3DScreen } from '../../screens/Tour3DScreen';

const DEFAULT_TOUR_DESTINATION = 'Hábitat del Tigre';

export default function Tour3DRoute() {
  const router = useRouter();
  const { destination: selectedDestination } = useLocalSearchParams<{ destination?: string }>();
  const routeDestination = Array.isArray(selectedDestination) ? selectedDestination[0] : selectedDestination;
  const [destination, setDestination] = useState(routeDestination ?? DEFAULT_TOUR_DESTINATION);

  useEffect(() => {
    if (routeDestination) {
      setDestination(routeDestination);
    }
  }, [routeDestination]);

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
