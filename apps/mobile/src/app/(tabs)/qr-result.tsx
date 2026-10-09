import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Animal } from '../../models';
import { QrResultScreen } from '../../screens/QrResultScreen';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';

export default function QrResultRoute() {
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
      .catch((error: unknown) => console.error('Error loading QR result:', error));
    return () => {
      isActive = false;
    };
  }, [animalId, getAnimalDetails]);

  return (
    <QrResultScreen
      animal={animal}
      onDetailsPress={() => animal && router.push({ pathname: '/animal/[id]', params: { id: animal.id } })}
      onContinuePress={() => router.replace('/')}
    />
  );
}
