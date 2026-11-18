import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, ScreenContainer, TitledLoading } from '../../components/ui';
import { CollectionScreen } from '../../screens/CollectionScreen';
import { Animal } from '../../models';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress, mergeDiscoveredSpecies, countsFromCollection } from '../../viewmodels/useVisitorProgress';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function CollectionRoute() {
  const router = useRouter();
  const { getAnimals } = useAnimalViewModel();
  const { user, error } = useUserViewModel();
  const progress = useVisitorProgress();
  const { isOffline } = useNetworkStatus();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);

  useEffect(() => {
    let isActive = true;
    getAnimals()
      .then((allAnimals) => {
        if (isActive) setAnimals(allAnimals);
      })
      .catch((error: unknown) => console.error('Error loading collection:', error))
      .finally(() => {
        if (isActive) setCatalogReady(true);
      });
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
      <ScreenContainer scroll={false}>
        <TitledLoading title="Mi Colección" message="Cargando colección…" />
      </ScreenContainer>
    );
  }

  const live = progress.snapshot;
  const shownAnimals = mergeDiscoveredSpecies(animals, live);
  const catalogProgress = {
    discovered: shownAnimals.filter((animal) => animal.isDiscovered).length,
    total: shownAnimals.length,
  };

  return (
    <CollectionScreen
      animals={shownAnimals}
      progress={catalogReady
        ? catalogProgress
        : (countsFromCollection(live)
          ?? { discovered: user?.discoveredCount ?? 0, total: user?.totalAnimals ?? 0 })}
      isOffline={isOffline}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
    />
  );
}
