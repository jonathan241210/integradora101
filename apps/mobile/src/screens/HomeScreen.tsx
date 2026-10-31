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
}: HomeScreenProps) {
  if (loading) {
    return (
      <ScreenContainer>
        <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
        <LoadingView message="Cargando el zoológico..." />
      </ScreenContainer>
    );
  }

  if (error && (!featuredAnimals || featuredAnimals.length === 0)) {
    return (
      <ScreenContainer>
        <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
        <ErrorView
          title="No pudimos conectar con el zoológico"
          message={error}
          onRetry={onRetry}
          retryLabel="Intentar de nuevo"
        />
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

      <View style={styles.headerSection}>
        <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
        <HeroBanner
          overline="¡Hola, explorador!"
          title="Bienvenido al Zoológico"
          subtitle="¿Qué hábitat descubriremos juntos hoy?"
        />
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
  headerSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md, marginVertical: spacing.lg },
  newsSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  eventsList: { gap: spacing.md },
});
