import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AnimalDetailScreen } from '../../screens/AnimalDetailScreen';
import { Animal } from '../../models';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';

export default function AnimalDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getAnimalDetails } = useAnimalViewModel();
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    setLoading(true);
    getAnimalDetails(id)
      .then((value) => {
        if (isActive) setAnimal(value);
      })
      .catch((error: unknown) => console.error('Error loading animal details:', error))
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [getAnimalDetails, id]);

  return (
    <AnimalDetailScreen
      animal={animal}
      loading={loading}
      onBackPress={() => router.back()}
      onNavigatePress={() => router.push(animal?.isDiscovered ? { pathname: '/map', params: { animalId: id } } : '/scan')}
    />
  );
}
