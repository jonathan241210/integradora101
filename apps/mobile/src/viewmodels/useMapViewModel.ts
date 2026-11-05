import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapFilter, MapPlace, MapSection } from '../models';
import { MapRepository, MapRepositoryImpl } from '../repositories';
import { haversineMeters } from '../utils/haversine';
import { ARRIVAL_RADIUS_METERS } from '../constants/zoo';

const defaultRepository = new MapRepositoryImpl();

export function useMapViewModel(repository: MapRepository = defaultRepository) {
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [sections, setSections] = useState<MapSection[]>([]);
  const [filter, setFilter] = useState<MapFilter>('all');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null);
  const [destinationPlaceId, setDestinationPlaceId] = useState<string | null>(null);
  const [arrivedAtPlace, setArrivedAtPlace] = useState<MapPlace | null>(null);
  const [dismissedArrivalPlaceId, setDismissedArrivalPlaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [loadedPlaces, loadedSections] = await Promise.all([
        repository.getPlaces(),
        repository.getSections(),
      ]);
      setPlaces(loadedPlaces);
      setSections(loadedSections);
    } catch (loadError: unknown) {
      console.error('Error loading map data:', loadError);
      setError('No se pudo cargar el mapa. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          place.visible && (filter === 'all' || place.kind === filter),
      ),
    [filter, places],
  );

  const selectedPlace = useMemo(
    () => filteredPlaces.find((place) => place.id === selectedPlaceId) ?? null,
    [filteredPlaces, selectedPlaceId],
  );

  const destinationPlace = useMemo(
    () => places.find((place) => place.id === destinationPlaceId) ?? null,
    [destinationPlaceId, places],
  );

  const focusedSectionId = useMemo(() => {
    const focusedPlace = places.find((place) => place.id === focusedPlaceId);
    return focusedPlace?.sectionId ?? null;
  }, [focusedPlaceId, places]);

  const focusNotFound = Boolean(
    focusedPlaceId && !isLoading && !places.some((place) => place.id === focusedPlaceId),
  );

  const selectPlace = useCallback((id: string) => {
    setSelectedPlaceId(id);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPlaceId(null);
    setFocusedPlaceId(null);
  }, []);

  const focusPlace = useCallback((id: string | null) => {
    setFocusedPlaceId(id);
    setSelectedPlaceId(id);
  }, []);

  const setDestination = useCallback((id: string | null) => {
    setDestinationPlaceId(id);
    if (id) {
      setDismissedArrivalPlaceId(null);
    }
  }, []);

  const dismissArrival = useCallback(() => {
    if (arrivedAtPlace) {
      setDismissedArrivalPlaceId(arrivedAtPlace.id);
    }
    setArrivedAtPlace(null);
  }, [arrivedAtPlace]);

  const checkArrival = useCallback(
    (userLat: number, userLon: number) => {
      if (!destinationPlace || destinationPlace.gpsLat === undefined || destinationPlace.gpsLon === undefined) {
        return;
      }

      if (dismissedArrivalPlaceId === destinationPlace.id) {
        return;
      }

      const distance = haversineMeters(
        userLat,
        userLon,
        destinationPlace.gpsLat,
        destinationPlace.gpsLon,
      );

      if (distance <= ARRIVAL_RADIUS_METERS) {
        setArrivedAtPlace(destinationPlace);
        setDestinationPlaceId(null);
      }
    },
    [destinationPlace, dismissedArrivalPlaceId],
  );

  return {
    places,
    sections,
    filteredPlaces,
    filter,
    selectedPlace,
    focusedPlaceId,
    focusedSectionId,
    focusNotFound,
    destinationPlaceId,
    destinationPlace,
    arrivedAtPlace,
    isLoading,
    error,
    load,
    retry: load,
    setFilter,
    selectPlace,
    clearSelection,
    focusPlace,
    setDestination,
    dismissArrival,
    checkArrival,
  };
}
