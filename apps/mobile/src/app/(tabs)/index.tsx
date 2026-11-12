import React, { useEffect, useState, useCallback } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  PORTAL_ALERT_TITLE,
  PORTAL_LEAVE_MESSAGE,
  PORTAL_MISSING_MESSAGE,
  resolvePortalPage,
  type PortalPage,
} from '../../navigation/portal';
import { HomeScreen } from '../../screens/HomeScreen';
import { useHomeViewModel } from '../../viewmodels/useHomeViewModel';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useFavoriteAnimals } from '../../viewmodels/useFavoriteAnimals';
import { useVisitorProgress, countsFromCollection } from '../../viewmodels/useVisitorProgress';
import { scanQueue, type QueuedScan } from '../../services/scanQueue';
import { Animal, News, ZooEvent } from '../../models';

type RememberedHome = { animals: Animal[]; events: ZooEvent[]; news: News[] };

let rememberedHome: RememberedHome | null = null;

function confirmPortal(page: PortalPage) {
  const url = resolvePortalPage(page);
  if (!url) {
    Alert.alert(PORTAL_ALERT_TITLE, PORTAL_MISSING_MESSAGE);
    return;
  }
  Alert.alert(
    PORTAL_ALERT_TITLE,
    PORTAL_LEAVE_MESSAGE,
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Continuar', onPress: () => { Linking.openURL(url).catch(() => undefined); } },
    ],
  );
}

export default function HomeRoute() {
  const router = useRouter();
  const { loadHomeData, refreshNewsAndEvents } = useHomeViewModel();
  const { isOffline } = useNetworkStatus();
  const { profile } = useVisitorProfile();
  const { ids: favoriteIds } = useFavoriteAnimals();
  const progress = useVisitorProgress();
  const { missions } = useUserViewModel();
  const params = useLocalSearchParams<{ panel?: string }>();
  const [pendingScans, setPendingScans] = useState<QueuedScan[]>([]);
  const [featuredAnimals, setFeaturedAnimals] = useState<Animal[]>(rememberedHome?.animals ?? []);
  const [events, setEvents] = useState<ZooEvent[]>(rememberedHome?.events ?? []);
  const [news, setNews] = useState<News[]>(rememberedHome?.news ?? []);
  const [loading, setLoading] = useState(rememberedHome === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!rememberedHome) setLoading(true);
    setError(null);
    loadHomeData()
      .then(({ animals, events, news }) => {
        rememberedHome = { animals, events, news };
        setFeaturedAnimals(animals);
        setEvents(events);
        setNews(news);
      })
      .catch(() => {
        if (!rememberedHome) {
          setError('No fue posible actualizar la información del zoológico.');
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [loadHomeData]);

  const refreshLists = useCallback(() => {
    setRefreshing(true);
    refreshNewsAndEvents()
      .then(({ events: nextEvents, news: nextNews }) => {
        rememberedHome = {
          animals: rememberedHome?.animals ?? [],
          events: nextEvents,
          news: nextNews,
        };
        setEvents(nextEvents);
        setNews(nextNews);
      })
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  }, [refreshNewsAndEvents]);

  useEffect(() => {
    reload();
  }, [reload]);

  const reloadScans = useCallback(async () => {
    setPendingScans(await scanQueue.list());
  }, []);

  useEffect(() => {
    void reloadScans();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void scanQueue.flush().finally(reloadScans);
    });
    return () => subscription.remove();
  }, [reloadScans]);

  const missionSource = progress.snapshot?.missions ?? missions;
  const pendingMissions = missionSource.filter((mission) => mission.progress < mission.total);

  return (
    <HomeScreen
      appName="ARCA-NB"
      featuredAnimals={featuredAnimals.filter((animal) => favoriteIds.includes(animal.id))}
      events={events}
      news={news}
      loading={loading}
      error={error}
      isOffline={isOffline}
      onRetry={reload}
      onSeeAllAnimalsPress={() => router.push('/search')}
      onAnimalPress={(id) => router.push({ pathname: '/animal/[id]', params: { id } })}
      onEventPress={(id) => router.push({ pathname: '/event-detail', params: { id } })}
      onNewsPress={(id) => router.push({ pathname: '/news-detail', params: { id } })}
      onSeeAllEventsPress={() => confirmPortal('eventos.html')}
      onSeeAllNewsPress={() => confirmPortal('noticias.html')}
      initialPanel={params.panel === 'missions' ? 'missions' : 'home'}
      missions={pendingMissions.length > 0 ? pendingMissions : missionSource}
      missionsLoading={progress.loading && !progress.snapshot && missionSource.length === 0}
      pendingScans={pendingScans}
      onMissionPress={(id) => router.push({ pathname: '/mission-detail', params: { id, returnTo: 'home' } })}
      onRetryScansPress={() => { void scanQueue.retry().finally(reloadScans); }}
      refreshing={refreshing}
      onRefresh={refreshLists}
      visitorName={profile?.nickname}
      discoveredCount={countsFromCollection(progress.snapshot)?.discovered}
      totalAnimals={countsFromCollection(progress.snapshot)?.total}
    />
  );
}
