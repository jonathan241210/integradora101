import React, { useEffect } from 'react';
import { MapScreen } from '../src/screens/MapScreen';
import { MapRepository, MapRepositoryImpl } from '../src/repositories';
import { useMapViewModel } from '../src/viewmodels/useMapViewModel';

export const defaultMapRepository = new MapRepositoryImpl();

interface LiveMapProps {
  repository?: MapRepository;
  focus?: string;
}

export function LiveMap({ repository = defaultMapRepository, focus }: LiveMapProps) {
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
      onSearchPress={() => undefined}
    />
  );
}
