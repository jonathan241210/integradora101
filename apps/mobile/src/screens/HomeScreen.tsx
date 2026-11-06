import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import {
  ScreenContainer,
  SectionHeader,
  HeroBanner,
  BrandHeader,
  AnimalHighlightCard,
  EventCard,
  HighlightNewsCard,
  GamePromoCard,
  OfflineBanner,
  LoadingView,
  EmptyView,
  ErrorView,
} from '../components/ui';
import { spacing } from '../theme/tokens';
import { Animal, ZooEvent, News } from '../models';

function homeGreeting(visitorName?: string | null, discovered?: number | null, total?: number | null) {
  if (!visitorName) {
    return {
      overline: '¡Hola, explorador!',
      title: 'Bienvenido al Zoológico',
      subtitle: '¿Qué hábitat descubriremos juntos hoy?',
    };
  }
  const hasCounts = typeof discovered === 'number' && typeof total === 'number' && total > 0;
  const remaining = hasCounts ? Math.max(0, (total as number) - (discovered as number)) : null;
  if (remaining === 0) {
    return {
      overline: `¡Hola, ${visitorName}!`,
      title: '¡Completaste el zoológico!',
      subtitle: 'Ya están todos en tu colección.',
    };
  }
  return {
    overline: `¡Hola, ${visitorName}!`,
    title: remaining === null ? 'Bienvenido al Zoológico' : `Te faltan ${remaining} ${remaining === 1 ? 'animal' : 'animales'}`,
    subtitle: 'Escanea un código y sigue descubriendo.',
  };
}

export interface HomeScreenProps {
  appName: string;
  featuredAnimals: Animal[];
  events: ZooEvent[];
  news: News;
  loading?: boolean;
  error?: string | null;
  isOffline?: boolean;
  onRetry?: () => void;
  onNotificationsPress?: () => void;
  onSeeAllAnimalsPress?: () => void;
  onAnimalPress?: (id: string) => void;
  onEventPress?: (id: string) => void;
  onOpenMissionsPress?: () => void;
  visitorName?: string | null;
  discoveredCount?: number | null;
  totalAnimals?: number | null;
}

export function HomeScreen({
  appName,
  featuredAnimals,
  events,
  news,
  loading = false,
  error = null,
  isOffline = false,
  onRetry,
  onNotificationsPress,
  onSeeAllAnimalsPress,
  onAnimalPress,
  onEventPress,
  onOpenMissionsPress,
  visitorName,
  discoveredCount,
  totalAnimals,
}: HomeScreenProps) {
  const header = (
    <View style={styles.headerSection}>
      <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
      <HeroBanner {...homeGreeting(visitorName, discoveredCount, totalAnimals)} />
    </View>
  );

  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        {header}
        <View style={styles.loadingFill}>
          <LoadingView message="Cargando el zoológico..." />
        </View>
      </ScreenContainer>
    );
  }

  if (error && (!featuredAnimals || featuredAnimals.length === 0)) {
    return (
      <ScreenContainer scroll={false}>
        {header}
        <View style={styles.loadingFill}>
          <ErrorView
            title="No pudimos conectar con el zoológico"
            message={error}
            onRetry={onRetry}
            retryLabel="Intentar de nuevo"
          />
        </View>
      </ScreenContainer>
    );
  }

  const safeFeaturedAnimals = Array.isArray(featuredAnimals) ? featuredAnimals : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const filteredFeaturedAnimals = safeFeaturedAnimals.filter(
    (animal): animal is Animal => animal !== undefined && animal !== null
  );
  const filteredEvents = safeEvents.filter(
    (event): event is ZooEvent => event !== undefined && event !== null
  );

  const displayAnimals = filteredFeaturedAnimals;
  const displayEvents = filteredEvents;
  const isEmpty = displayAnimals.length === 0 && displayEvents.length === 0;

  return (
    <ScreenContainer>
      {isOffline && <OfflineBanner />}

      {header}
      <View style={styles.sectionHeader}>
        <SectionHeader
          title="Animales Destacados"
          actionLabel="Ver todo"
          onActionPress={onSeeAllAnimalsPress}
        />
      </View>

      {isEmpty ? (
        <EmptyView
          title="No hay animales o eventos por ahora"
          message="Vuelve a consultar más tarde para conocer las novedades del parque."
        />
      ) : (
        <>
          <FlatList
            horizontal
            data={displayAnimals}
            keyExtractor={(item, index) => (item?.id ? item.id : `item-${index}`)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
            renderItem={({ item }) => {
              if (!item) return null;
              return (
                <AnimalHighlightCard
                  animal={item}
                  onPress={() => {
                    if (onAnimalPress && item?.id) {
                      onAnimalPress(item.id);
                    }
                  }}
                />
              );
            }}
          />

          <View style={styles.newsSection}>
            {news?.title ? <HighlightNewsCard news={news} /> : null}
            <GamePromoCard onPress={() => onOpenMissionsPress?.()} />
            <SectionHeader title="Próximos Eventos" />
            <View style={styles.eventsList}>
              {displayEvents.map((event) => {
                if (!event) return null;
                return (
                  <EventCard
                    key={event.id}
                    event={event}
                    onPress={() => onEventPress?.(event.id)}
                  />
                );
              })}
            </View>
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  sectionHeader: { paddingHorizontal: spacing.lg },
  loadingFill: { flex: 1, justifyContent: 'center' },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md, marginVertical: spacing.lg },
  newsSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  eventsList: { gap: spacing.md },
});
