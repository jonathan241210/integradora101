import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, LoadingView, ScreenContainer } from '../../components/ui';
import { CollectionScreen } from '../../screens/CollectionScreen';
import { Animal } from '../../models';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress, mergeDiscoveredSpecies } from '../../viewmodels/useVisitorProgress';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function CollectionRoute() {
  const router = useRouter();
  const { getAnimals } = useAnimalViewModel();
  const { user, error } = useUserViewModel();
  const progress = useVisitorProgress();
  const { isOffline } = useNetworkStatus();
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

  if (progress.loading && !progress.snapshot) {
    return (
      <ScreenContainer>
        <LoadingView message="Cargando colección…" />
      </ScreenContainer>
    );
  }

  const live = progress.snapshot;
  const shownAnimals = mergeDiscoveredSpecies(animals, live);

  return (
    <CollectionScreen
      animals={shownAnimals}
      progress={live
        ? { discovered: live.progress.discoveredSpecies, total: live.progress.totalSpecies }
        : { discovered: user?.discoveredCount ?? 0, total: user?.totalAnimals ?? 0 }}
      isOffline={isOffline}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
    />
  );
}
