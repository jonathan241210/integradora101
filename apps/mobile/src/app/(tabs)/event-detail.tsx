import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventDetailScreen } from '../../screens/EventDetailScreen';
import { ZooEvent } from '../../models';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';

export default function EventDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEvents } = useHomeViewModel();
  const [event, setEvent] = useState<ZooEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    getEvents()
      .then((events) => {
        if (isActive) setEvent(events.find((item) => item.id === id) ?? null);
      })
      .catch((loadError: unknown) => {
        console.error('Error loading event details:', loadError);
        if (isActive) setError('No se pudo cargar la información del evento.');
      })
      .finally(() => {
        if (isActive) setLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, [getEvents, id]);

  return <EventDetailScreen event={event} loading={loading} error={error} onBackPress={() => router.back()} />;
}
