import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, ScreenContainer } from '../../components/ui';
import { CollectionScreen } from '../../screens/CollectionScreen';
import { Animal } from '../../models';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function CollectionRoute() {
  const router = useRouter();
  const { getAnimals } = useAnimalViewModel();
  const { user, error } = useUserViewModel();
  const [animals, setAnimals] = useState<Animal[]>([]);

  useEffect(() => {
    let isActive = true;
    getAnimals()
      .then((allAnimals) => {
        if (isActive) setAnimals(allAnimals);
      })
      .catch((error: unknown) => console.error('Error loading collection:', error));
    return () => {
      isActive = false;
    };
  }, [getAnimals]);

  if (error) {
    return (
      <ScreenContainer>
        <AppText variant="body" color="danger">No se pudo cargar la colección: {error}</AppText>
      </ScreenContainer>
    );
  }

  return (
    <CollectionScreen
      animals={animals}
      progress={{ discovered: user?.discoveredCount ?? 0, total: user?.totalAnimals ?? 0 }}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
    />
  );
}
