import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AnimalDetailScreen } from '../../screens/AnimalDetailScreen';
import { Animal } from '../../models';
import { peekScanResult, scanResultParams } from '../../navigation/presentScanResult';
import { accountSession } from '../../session/accountSession';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { mergeDiscoveredSpecies, useVisitorProgress } from '../../viewmodels/useVisitorProgress';
import { useFavoriteAnimals } from '../../viewmodels/useFavoriteAnimals';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function AnimalDetailRoute() {
  const router = useRouter();
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const { getAnimalDetails } = useAnimalViewModel();
  const progress = useVisitorProgress();
  const { isOffline } = useNetworkStatus();
  const { ids: favoriteIds, toggle } = useFavoriteAnimals();
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

  const waitingForDiscovery = accountSession.getStatus() === 'authenticated'
    && progress.loading
    && progress.snapshot === null;
  const shown = animal ? mergeDiscoveredSpecies([animal], progress.snapshot)[0] : null;

  return (
    <AnimalDetailScreen
      animal={shown}
      loading={loading || waitingForDiscovery}
      isOffline={isOffline}
      onBackPress={() => {
        if (from === 'scan-result') {
          const saved = peekScanResult();
          if (saved) {
            router.navigate({ pathname: '/scan-result', params: scanResultParams(saved) });
            return;
          }
        }
        router.back();
      }}
      onNavigatePress={() => router.push(shown?.isDiscovered ? { pathname: '/map', params: { animalId: id } } : '/discover')}
      isFavorite={typeof id === 'string' && favoriteIds.includes(id)}
      onToggleFavorite={typeof id === 'string' ? () => { void toggle(id); } : undefined}
    />
  );
}
