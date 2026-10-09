import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { HomeScreen } from '../../screens/HomeScreen';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { Animal, News, ZooEvent } from '../../models';

export default function HomeRoute() {
  const router = useRouter();
  const { getFeaturedAnimals, getEvents, getNews } = useHomeViewModel();
  const [featuredAnimals, setFeaturedAnimals] = useState<Animal[]>([]);
  const [events, setEvents] = useState<ZooEvent[]>([]);
  const [news, setNews] = useState<News>({ title: '', body: '' });

  useEffect(() => {
    let isActive = true;
    Promise.all([getFeaturedAnimals(), getEvents(), getNews()])
      .then(([animals, zooEvents, zooNews]) => {
        if (isActive) {
          setFeaturedAnimals(animals);
          setEvents(zooEvents);
          setNews(zooNews);
        }
      })
      .catch((error: unknown) => console.error('Error loading home data:', error));

    return () => {
      isActive = false;
    };
  }, [getEvents, getFeaturedAnimals, getNews]);

  return (
    <HomeScreen
      appName="ARCA-NB"
      featuredAnimals={featuredAnimals}
      events={events}
      news={news}
      onSeeAllAnimalsPress={() => router.push('/search')}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
      onEventPress={(id) => router.push({ pathname: '/event-detail', params: { id } })}
      onOpenMissionsPress={() => router.push('/game')}
    />
  );
}
