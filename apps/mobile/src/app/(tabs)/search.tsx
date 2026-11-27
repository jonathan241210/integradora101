import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SearchScreen, type SearchFilter, type SearchPlaceResult } from '../../screens/SearchScreen';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';
import { createMapRepository } from '../../repositories';
import { toZooPlaceMarker } from '../../viewmodels/useMapMarkers';
import { FOOD_SERVICE_MAP_ANCHOR, FOOD_SERVICE_MAP_ID } from '../../constants/zoo';
import { Animal, MapPlace } from '../../models';

const mapRepository = createMapRepository();

function matchesQuery(query: string, ...values: Array<string | undefined | null>) {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return true;
  return values.some((value) => value?.toLocaleLowerCase().includes(normalized));
}

function mapPlaceToSearchResult(place: MapPlace): SearchPlaceResult {
  return {
    id: place.id,
    name: place.name,
    description: place.description,
    kind: place.kind,
    placeTypeLabel: place.kind === 'service' ? 'Servicio' : place.kind === 'entrance' ? 'Acceso' : 'Lugar',
  };
}

export default function SearchRoute() {
  const router = useRouter();
  const { selectForTour, returnTo, destination } = useLocalSearchParams<{
    selectForTour?: string;
    returnTo?: string;
    destination?: string;
  }>();
  const { getAnimals } = useAnimalViewModel();
  const { isOffline } = useNetworkStatus();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [places, setPlaces] = useState<SearchPlaceResult[]>([]);

  useEffect(() => {
    let isActive = true;
    getAnimals()
      .then((allAnimals) => {
        if (isActive) setAnimals(allAnimals);
      })
      .catch((error: unknown) => console.error('Error loading animals:', error));
    return () => {
      isActive = false;
    };
  }, [getAnimals]);

  useEffect(() => {
    let isActive = true;
    Promise.all([mapRepository.getPlaces(), mapRepository.getZooPlaces().catch(() => [])])
      .then(([mapPlaces, zooPlaces]) => {
        if (!isActive) return;
        const zooMarkers = zooPlaces
          .map(toZooPlaceMarker)
          .filter((place): place is MapPlace => place !== null)
          .map((place) => ({
            id: place.id,
            name: place.name,
            description: place.description,
            kind: place.kind,
            placeTypeLabel: place.isVisitorService ? 'Servicio' : 'Lugar',
          }));
        const hasFoodMarker = zooMarkers.some((place) => place.id === `zoo-place-17` || place.name === 'Establecimientos de comida');
        const basePlaces = mapPlaces
          .filter((place) => {
            if (!place.visible) return false;
            if (place.id === FOOD_SERVICE_MAP_ID) return !hasFoodMarker;
            return zooPlaces.length === 0 || (place.id !== 'restrooms' && place.id !== 'main-entrance');
          })
          .map(mapPlaceToSearchResult);
        const deduped = new Map<string, SearchPlaceResult>();
        for (const place of [...basePlaces, ...zooMarkers]) {
          deduped.set(place.id, place);
        }
        setPlaces(Array.from(deduped.values()));
      })
      .catch((error: unknown) => console.error('Error loading places:', error));
    return () => {
      isActive = false;
    };
  }, []);

  const filteredAnimals = useMemo(() => {
    if (filter === 'service') return [];
    return animals.filter((animal) =>
      matchesQuery(query, animal.nickname, animal.commonName, animal.scientificName, animal.zone),
    );
  }, [animals, filter, query]);

  const filteredPlaces = useMemo(() => {
    if (filter === 'animal') return [];
    return places.filter((place) => matchesQuery(query, place.name, place.description, place.placeTypeLabel));
  }, [filter, places, query]);

  const goToMapFocus = (id: string) => {
    router.replace({ pathname: '/map', params: { focus: id } });
  };

  return (
    <SearchScreen
      animals={filteredAnimals}
      places={filteredPlaces}
      query={query}
      activeFilter={filter}
      selectForTour={selectForTour === 'true'}
      selectionHint={
        returnTo === 'map'
          ? 'Selecciona un animal o servicio para ubicarlo en el mapa.'
          : undefined
      }
      isOffline={isOffline}
      backLabel={
        returnTo === 'tour-3d'
          ? 'Volver al recorrido 3D'
          : returnTo === 'map'
            ? 'Volver al mapa'
            : 'Volver a inicio'
      }
      onQueryChange={setQuery}
      onFilterChange={setFilter}
      onAnimalPress={(id) => {
        if (selectForTour === 'true') {
          if (returnTo === 'map') {
            goToMapFocus(id);
            return;
          }
          const animal = animals.find((item) => item.id === id);
          if (animal) {
            router.replace({
              pathname: '/tour-3d',
              params: { destination: `${animal.nickname} — ${animal.zone}` },
            });
          }
          return;
        }
        router.push({ pathname: '/animal/[id]', params: { id } });
      }}
      onPlacePress={(id) => {
        if (returnTo === 'map' || selectForTour === 'true') {
          goToMapFocus(id);
          return;
        }
        goToMapFocus(id);
      }}
      onBackPress={() => {
        if (selectForTour === 'true' && returnTo === 'tour-3d') {
          router.replace({ pathname: '/tour-3d', params: destination ? { destination } : {} });
        } else if (selectForTour === 'true' && returnTo === 'map') {
          router.replace('/map');
        } else {
          router.replace('/');
        }
      }}
    />
  );
}
