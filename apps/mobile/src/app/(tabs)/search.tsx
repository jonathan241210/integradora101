import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SearchScreen } from '../../screens/SearchScreen';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { Animal } from '../../models';

type Category = 'all' | NonNullable<Animal['category']>;

export default function SearchRoute() {
  const router = useRouter();
  const { selectForTour, returnTo, destination } = useLocalSearchParams<{
    selectForTour?: string;
    returnTo?: string;
    destination?: string;
  }>();
  const { getAnimals } = useAnimalViewModel();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [animals, setAnimals] = useState<Animal[]>([]);

  useEffect(() => {
    let isActive = true;
    getAnimals(query, category)
      .then((filteredAnimals) => {
        if (isActive) setAnimals(filteredAnimals);
      })
      .catch((error: unknown) => console.error('Error loading animals:', error));
    return () => {
      isActive = false;
    };
  }, [category, getAnimals, query]);

  return (
    <SearchScreen
      animals={animals}
      query={query}
      activeFilter={category}
      selectForTour={selectForTour === 'true'}
      backLabel={
        returnTo === 'tour-3d'
          ? 'Volver al recorrido 3D'
          : returnTo === 'map'
            ? 'Volver al mapa'
            : 'Volver a inicio'
      }
      onQueryChange={setQuery}
      onFilterChange={setCategory}
      onAnimalPress={(id) => {
        if (selectForTour === 'true') {
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
