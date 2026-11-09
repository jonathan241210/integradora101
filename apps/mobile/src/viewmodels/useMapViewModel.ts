import { useCallback, useEffect, useMemo, useState } from 'react';
import { Vibration } from 'react-native';
import { MapFilter, MapPlace, MapSection } from '../models';
import { MapRepository, createMapRepository } from '../repositories';
import { haversineMeters } from '../utils/haversine';
import { geoTransform } from '../utils/geoTransform';
import {
  ARRIVAL_RADIUS_METERS,
  SVG_HEIGHT,
  SVG_WIDTH,
} from '../constants/zoo';
import { SVG_UNIT_TO_METERS } from '../constants/zooPaths';

const defaultRepository = createMapRepository();

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
    setDismissedArrivalPlaceId(null);
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
    setDismissedArrivalPlaceId(null);
  }, []);

  const dismissArrival = useCallback(() => {
    if (arrivedAtPlace) {
      setDismissedArrivalPlaceId(arrivedAtPlace.id);
    }
    setArrivedAtPlace(null);
    setDestinationPlaceId(null);
  }, [arrivedAtPlace]);

  const checkArrival = useCallback(
    (userLat: number, userLon: number) => {
      const target = destinationPlace ?? selectedPlace;
      if (!target) {
        return;
      }

      if (dismissedArrivalPlaceId === target.id) {
        return;
      }

      let distance = 999999;
      if (target.gpsLat !== undefined && target.gpsLon !== undefined) {
        distance = haversineMeters(
          userLat,
          userLon,
          target.gpsLat,
          target.gpsLon,
        );
      }

      // Medición en espacio SVG para asegurar detección en el plano
      const { svgX: userSvgX, svgY: userSvgY } = geoTransform(userLat, userLon);
      const targetSvgX = target.mapX * SVG_WIDTH;
      const targetSvgY = target.mapY * SVG_HEIGHT;
      const svgDistance =
        Math.hypot(userSvgX - targetSvgX, userSvgY - targetSvgY) * SVG_UNIT_TO_METERS;

      const effectiveDistance = Math.min(distance, svgDistance);

      if (effectiveDistance <= ARRIVAL_RADIUS_METERS) {
        setArrivedAtPlace(target);
        setDestinationPlaceId(null);
        try {
          Vibration.vibrate([0, 150, 80, 150]);
        } catch {
          // Si el dispositivo no tiene soporte de vibración, continúa normalmente
        }
      }
    },
    [destinationPlace, selectedPlace, dismissedArrivalPlaceId],
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
