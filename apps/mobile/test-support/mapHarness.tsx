import React, { useEffect } from 'react';
import { MapScreen } from '../src/screens/MapScreen';
import { MapRepository, MapRepositoryImpl } from '../src/repositories';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';
import type { UserPosition } from '../src/viewmodels/useLocationViewModel';

export const defaultMapRepository = new MapRepositoryImpl();

interface LiveMapProps {
  repository?: MapRepository;
  focus?: string;
  userPosition?: UserPosition;
}

export function LiveMap({ repository = defaultMapRepository, focus, userPosition }: LiveMapProps) {
  const {
    sections,
    filteredPlaces,
    zooPlaces,
    filter,
    selectedPlace,
    destinationPlace,
    destinationPlaceId,
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
    setDestination,
  } = useMapViewModel(repository);

  useEffect(() => {
    if (focus) {
      focusPlace(focus);
    }
  }, [focus, focusPlace]);

  return (
    <MapScreen
      sections={sections}
      filteredPlaces={filteredPlaces}
      zooPlaces={zooPlaces}
      filter={filter}
      selectedPlace={selectedPlace}
      destinationPlace={destinationPlace}
      userPosition={userPosition}
      focusedSectionId={focusedSectionId}
      focusedPlaceId={focusedPlaceId}
      focusNotFound={focusNotFound}
      isLoading={isLoading}
      error={error}
      onFilterChange={setFilter}
      onSelectPlace={selectPlace}
      onToggleDestination={(id) => setDestination(destinationPlaceId === id ? null : id)}
      onCloseDetail={clearSelection}
      onRetry={retry}
      onSearchPress={() => undefined}
    />
  );
}
