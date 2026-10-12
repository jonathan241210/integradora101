import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { MapLocation, MapRoute as ZooMapRoute } from '../../models';
import { MapScreen } from '../../screens/MapScreen';
import { useMapViewModel } from '../../viewmodels/useMapViewModel';

export default function MapRoute() {
  const router = useRouter();
  const { getMapData } = useMapViewModel();
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [activeRoute, setActiveRoute] = useState<ZooMapRoute>({
    destination: '',
    duration: '',
    distance: '',
    direction: '',
    steps: [],
  });

  useEffect(() => {
    let isActive = true;
    getMapData()
      .then((data) => {
        if (!isActive) return;
        setLocations(data.locations);
        setActiveRoute(data.activeRoute);
      })
      .catch((error: unknown) => console.error('Error loading map data:', error));
    return () => {
      isActive = false;
    };
  }, [getMapData]);

  return (
    <MapScreen
      locations={locations}
      activeRoute={activeRoute}
      onSearchPress={() => router.push({
        pathname: '/search',
        params: { selectForTour: 'true', returnTo: 'map' },
      })}
      onTourPress={() => router.push('/tour-3d')}
    />
  );
}
