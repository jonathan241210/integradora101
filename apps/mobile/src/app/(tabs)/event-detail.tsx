import React, { useEffect, useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { EventDetailScreen } from '../../screens/EventDetailScreen';
import { ZooEvent } from '../../models';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function EventDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getEventDetails } = useHomeViewModel();
  const { isOffline } = useNetworkStatus();
  const [event, setEvent] = useState<ZooEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await getEventDetails(id);
      setEvent(result);
      if (!result) {
        setError('No se encontró el evento solicitado.');
      }
    } catch (loadError: unknown) {
      console.error('Error loading event details:', loadError);
      setError('No se pudo cargar la información del evento.');
    } finally {
      setLoading(false);
    }
  }, [id, getEventDetails]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <EventDetailScreen
      event={event}
      loading={loading}
      error={error}
      isOffline={isOffline}
      onBackPress={() => router.back()}
    />
  );
}
