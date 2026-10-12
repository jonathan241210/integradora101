import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Animal } from '../../models';
import { QrAlreadyDiscoveredScreen } from '../../screens/QrAlreadyDiscoveredScreen';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';

export default function QrAlreadyDiscoveredRoute() {
  const router = useRouter();
  const { animalId } = useLocalSearchParams<{ animalId?: string }>();
  const { getAnimalDetails } = useAnimalViewModel();
  const [animal, setAnimal] = useState<Animal | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!animalId) return;
    getAnimalDetails(animalId)
      .then((value) => {
        if (isActive) setAnimal(value);
      })
      .catch((error: unknown) => console.error('Error loading discovered animal:', error));
    return () => {
      isActive = false;
    };
  }, [animalId, getAnimalDetails]);

  return (
    <QrAlreadyDiscoveredScreen
      animal={animal}
      onCollectionPress={() => router.replace('/collection')}
      onContinuePress={() => router.replace('/')}
    />
  );
}
