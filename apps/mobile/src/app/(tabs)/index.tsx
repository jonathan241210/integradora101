import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { HomeScreen } from '../../screens/HomeScreen';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { Animal, News, ZooEvent } from '../../models';

export default function HomeRoute() {
  const router = useRouter();
  const { loadHomeData } = useHomeViewModel();
  const [featuredAnimals, setFeaturedAnimals] = useState<Animal[]>([]);
  const [events, setEvents] = useState<ZooEvent[]>([]);
  const [news, setNews] = useState<News>({ title: '', body: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    loadHomeData()
      .then(({ animals, events, news }) => {
        setFeaturedAnimals(animals);
        setEvents(events);
        setNews(news);
      })
      .catch(() => {
        setError('No fue posible actualizar la información del zoológico.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadHomeData]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <HomeScreen
      appName="ARCA-NB"
      featuredAnimals={featuredAnimals}
      events={events}
      news={news}
      loading={loading}
      error={error}
      onRetry={reload}
      onSeeAllAnimalsPress={() => router.push('/search')}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
      onEventPress={(id) => router.push({ pathname: '/event-detail', params: { id } })}
      onOpenMissionsPress={() => router.push('/game')}
    />
  );
}
