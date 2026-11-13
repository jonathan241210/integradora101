import React, { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { NewsDetailScreen } from '../../screens/NewsDetailScreen';
import { News } from '../../models';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';

export default function NewsDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getNewsDetails } = useHomeViewModel();
  const { isOffline } = useNetworkStatus();
  const [news, setNews] = useState<News | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setLoading(false);
      setError('No se encontró la noticia.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getNewsDetails(id);
      setNews(result);
      if (!result) setError('No se encontró la noticia.');
    } catch {
      setError('No se pudo cargar la noticia.');
    } finally {
      setLoading(false);
    }
  }, [id, getNewsDetails]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return (
    <NewsDetailScreen
      news={news}
      loading={loading}
      error={error}
      isOffline={isOffline}
      onBackPress={() => goBackWithinTabs(router)}
    />
  );
}
