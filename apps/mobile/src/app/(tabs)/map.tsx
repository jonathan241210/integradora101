import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapScreen } from '../../screens/MapScreen';
import { useMapViewModel } from '../../viewmodels/useMapViewModel';
import { useLocationViewModel } from '../../viewmodels/useLocationViewModel';

export default function MapRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focus = Array.isArray(params.focus) ? params.focus[0] : params.focus;
  const {
    sections,
    filteredPlaces,
    filter,
    selectedPlace,
    focusedSectionId,
    focusedPlaceId,
    focusNotFound,
    destinationPlaceId,
    destinationPlace,
    arrivedAtPlace,
    isLoading,
    error,
    retry,
    setFilter,
    selectPlace,
    clearSelection,
    focusPlace,
    setDestination,
    dismissArrival,
    checkArrival,
  } = useMapViewModel();

  const { userPosition } = useLocationViewModel();

  useEffect(() => {
    if (focus) {
      focusPlace(focus);
    }
  }, [focus, focusPlace]);

  useEffect(() => {
    if (userPosition && !userPosition.searching) {
      checkArrival(userPosition.lat, userPosition.lon);
    }
  }, [userPosition, checkArrival]);

  const handleToggleDestination = (id: string) => {
    setDestination(destinationPlaceId === id ? null : id);
  };

  return (
    <MapScreen
      sections={sections}
      filteredPlaces={filteredPlaces}
      filter={filter}
      selectedPlace={selectedPlace}
      focusedSectionId={focusedSectionId}
      focusedPlaceId={focusedPlaceId}
      focusNotFound={focusNotFound}
      isLoading={isLoading}
      error={error}
      onFilterChange={setFilter}
      onSelectPlace={selectPlace}
      onCloseDetail={clearSelection}
      onRetry={retry}
      onSearchPress={() =>
        router.push({
          pathname: '/search',
          params: { selectForTour: 'true', returnTo: 'map' },
        })
      }
      userPosition={userPosition}
      destinationPlace={destinationPlace}
      arrivedAtPlace={arrivedAtPlace}
      onToggleDestination={handleToggleDestination}
      onDismissArrival={dismissArrival}
    />
  );
}
