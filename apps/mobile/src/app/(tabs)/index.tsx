import { useCallback, useEffect, useRef, useState } from 'react';
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
import { useHomeViewModel, type HomeListRefresh } from '../../viewmodels/useHomeViewModel';
import { useNetworkStatus } from '../../viewmodels/useNetworkStatus';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { animalsInFavoriteOrder, useVisitorFavorites } from '../../viewmodels/useFavoriteAnimals';
import { mergeDiscoveredSpecies, useVisitorProgress } from '../../viewmodels/useVisitorProgress';
import { scanQueue, type QueuedScan } from '../../services/scanQueue';
import { Animal, News, ZooEvent } from '../../models';
import { listenForPublicContentPush } from '../../push/publicContentPush';

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
  const { ids: favoriteIds } = useVisitorFavorites();
  const progress = useVisitorProgress();
  const { missions, status: userStatus, error: userError, refresh: refreshUser } = useUserViewModel();
  const params = useLocalSearchParams<{ panel?: string }>();
  const [pendingScans, setPendingScans] = useState<QueuedScan[]>([]);
  const [featuredAnimals, setFeaturedAnimals] = useState<Animal[]>(rememberedHome?.animals ?? []);
  const [events, setEvents] = useState<ZooEvent[]>(rememberedHome?.events ?? []);
  const [news, setNews] = useState<News[]>(rememberedHome?.news ?? []);
  const [loading, setLoading] = useState(rememberedHome === null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const homeLoad = useRef(0);
  const listLoad = useRef(0);
  const refreshInProgress = useRef(false);
  const queuedRefresh = useRef<'manual' | 'push' | null>(null);
  const wasOffline = useRef(isOffline);
  const latestAnimals = useRef(featuredAnimals);

  const reload = useCallback(() => {
    const load = ++homeLoad.current;
    const lists = ++listLoad.current;
    let revalidatedEvents: ZooEvent[] | undefined;
    let revalidatedNews: News[] | undefined;
    if (!rememberedHome) setLoading(true);
    refreshInProgress.current = false;
    queuedRefresh.current = null;
    setRefreshing(false);
    setError(null);
    loadHomeData({
      events: (next) => {
        if (lists !== listLoad.current) return;
        revalidatedEvents = next;
        if (rememberedHome) rememberedHome = { ...rememberedHome, events: next };
        setEvents(next);
      },
      news: (next) => {
        if (lists !== listLoad.current) return;
        revalidatedNews = next;
        if (rememberedHome) rememberedHome = { ...rememberedHome, news: next };
        setNews(next);
      },
    })
      .then(({ animals, events, news }) => {
        if (load !== homeLoad.current) return;
        latestAnimals.current = animals;
        setFeaturedAnimals(animals);
        if (lists === listLoad.current) {
          rememberedHome = { animals, events: revalidatedEvents ?? events, news: revalidatedNews ?? news };
          setEvents(rememberedHome.events);
          setNews(rememberedHome.news);
        } else if (rememberedHome) {
          rememberedHome = { ...rememberedHome, animals };
        }
      })
      .catch(() => {
        if (load === homeLoad.current && !rememberedHome) {
          setError('No fue posible actualizar la información del zoológico.');
        }
      })
      .finally(() => {
        if (load === homeLoad.current) setLoading(false);
      });
  }, [loadHomeData]);

  const refreshLists = useCallback(function refresh(mode: HomeListRefresh = 'manual') {
    if (mode === 'manual') setRefreshing(true);
    if (refreshInProgress.current) {
      if (mode === 'manual' || (mode === 'push' && queuedRefresh.current === null)) {
        queuedRefresh.current = mode;
      }
      return;
    }
    refreshInProgress.current = true;
    const lists = ++listLoad.current;
    refreshNewsAndEvents(mode)
      .then(({ events: nextEvents, news: nextNews }) => {
        if (lists !== listLoad.current) return;
        rememberedHome = {
          animals: latestAnimals.current,
          events: nextEvents,
          news: nextNews,
        };
        setEvents(nextEvents);
        setNews(nextNews);
      })
      .catch(() => undefined)
      .finally(() => {
        if (lists !== listLoad.current) return;
        refreshInProgress.current = false;
        const next = queuedRefresh.current;
        queuedRefresh.current = null;
        if (next !== 'manual') setRefreshing(false);
        if (next) refresh(next);
      });
  }, [refreshNewsAndEvents]);

  useEffect(() => {
    reload();
    return () => {
      homeLoad.current += 1;
      listLoad.current += 1;
      refreshInProgress.current = false;
      queuedRefresh.current = null;
    };
  }, [reload]);

  useEffect(() => listenForPublicContentPush(() => refreshLists('push')), [refreshLists]);

  useEffect(() => {
    if (wasOffline.current && !isOffline) refreshLists('stale');
    wasOffline.current = isOffline;
  }, [isOffline, refreshLists]);

  const reloadScans = useCallback(async () => {
    setPendingScans(await scanQueue.list());
  }, []);

  useEffect(() => {
    void reloadScans();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshLists('stale');
        void scanQueue.flush().finally(reloadScans);
      }
    });
    return () => subscription.remove();
  }, [refreshLists, reloadScans]);

  const missionSource = progress.snapshot?.missions ?? missions;
  const catalog = mergeDiscoveredSpecies(featuredAnimals, progress.snapshot);
  const discoveredInCatalog = catalog.filter((animal) => animal.isDiscovered).length;

  return (
    <HomeScreen
      appName="ARCA-NB"
      featuredAnimals={animalsInFavoriteOrder(catalog, favoriteIds)}
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
      missions={missionSource}
      missionsLoading={progress.loading && !progress.snapshot && missionSource.length === 0}
      pendingScans={pendingScans}
      missionsAccess={userStatus === 'guest' || userStatus === 'error'
        ? { status: userStatus, error: userError, onLogin: () => router.replace('/login'), onRetry: refreshUser }
        : undefined}
      onMissionPress={(id) => router.push({ pathname: '/mission-detail', params: { id, returnTo: 'home' } })}
      onAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'game', returnTo: 'home' } })}
      onRetryScansPress={() => { void scanQueue.retry().finally(reloadScans); }}
      refreshing={refreshing}
      onRefresh={() => refreshLists()}
      visitorName={profile?.nickname}
      discoveredCount={loading ? undefined : discoveredInCatalog}
      totalAnimals={loading ? undefined : catalog.length}
    />
  );
}
