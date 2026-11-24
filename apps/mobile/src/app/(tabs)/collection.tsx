import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScreenContainer, TitledLoading, VisitorDataGate } from '../../components/ui';
import { CollectionScreen } from '../../screens/CollectionScreen';
import { Animal } from '../../models';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress, mergeDiscoveredSpecies, countsFromCollection } from '../../viewmodels/useVisitorProgress';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function CollectionRoute() {
  const router = useRouter();
  const { getAnimals } = useAnimalViewModel();
  const { user, error, status, refresh } = useUserViewModel();
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

  if (status === 'guest' || status === 'error') {
    return (
      <VisitorDataGate
        title="Mi Colección"
        status={status}
        error={error}
        onLogin={() => router.replace('/login')}
        onRetry={refresh}
      >
        {null}
      </VisitorDataGate>
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
