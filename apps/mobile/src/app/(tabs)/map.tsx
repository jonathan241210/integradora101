import React, { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapScreen } from '../../screens/MapScreen';
import { useMapViewModel } from '../../viewmodels/useMapViewModel';

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
    isLoading,
    error,
    retry,
    setFilter,
    selectPlace,
    clearSelection,
    focusPlace,
  } = useMapViewModel();

  useEffect(() => {
    if (focus) {
      focusPlace(focus);
    }
  }, [focus, focusPlace]);

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
      onSearchPress={() => router.push({
        pathname: '/search',
        params: { selectForTour: 'true', returnTo: 'map' },
      })}
    />
  );
}
