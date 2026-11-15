import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../components/ui/Icon';
import {
  ScreenContainer,
  SectionHeader,
  HeroBanner,
  BrandHeader,
  AnimalHighlightCard,
  EventCard,
  HighlightNewsCard,
  OfflineBanner,
  LoadingView,
  EmptyView,
  ErrorView,
} from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { GameScreen } from './GameScreen';
import { Animal, ZooEvent, News, Mission } from '../models';

type HomePanel = 'home' | 'missions';

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
  news: News[];
  loading?: boolean;
  error?: string | null;
  isOffline?: boolean;
  onRetry?: () => void;
  onNotificationsPress?: () => void;
  onSeeAllAnimalsPress?: () => void;
  onAnimalPress?: (id: string) => void;
  onEventPress?: (id: string) => void;
  onNewsPress?: (id: string) => void;
  onSeeAllEventsPress?: () => void;
  onSeeAllNewsPress?: () => void;
  initialPanel?: HomePanel;
  missions?: Mission[];
  missionsLoading?: boolean;
  pendingScans?: { clientScanId: string; code: string }[];
  onMissionPress?: (id: string) => void;
  onRetryScansPress?: () => void;
  visitorName?: string | null;
  discoveredCount?: number | null;
  totalAnimals?: number | null;
  refreshing?: boolean;
  onRefresh?: () => void;
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
  onNewsPress,
  onSeeAllEventsPress,
  onSeeAllNewsPress,
  initialPanel = 'home',
  missions = [],
  missionsLoading = false,
  pendingScans = [],
  onMissionPress,
  onRetryScansPress,
  visitorName,
  discoveredCount,
  totalAnimals,
  refreshing = false,
  onRefresh,
}: HomeScreenProps) {
  const [panel, setPanel] = useState<HomePanel>(initialPanel);
  const header = (
    <View style={styles.headerSection}>
      <BrandHeader appName={appName} onBellPress={onNotificationsPress} />
      <HomeSwitcher panel={panel} onChange={setPanel} />
      {panel === 'home' ? <HeroBanner {...homeGreeting(visitorName, discoveredCount, totalAnimals)} /> : null}
    </View>
  );

  if (panel === 'missions') {
    return (
      <ScreenContainer>
        {header}
        <GameScreen
          embedded
          missions={missions}
          pendingScans={pendingScans}
          loading={missionsLoading}
          onBackPress={() => setPanel('home')}
          onMissionPress={(id) => onMissionPress?.(id)}
          onRetryPress={onRetryScansPress}
        />
      </ScreenContainer>
    );
  }

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
  const safeNews = Array.isArray(news) ? news : [];

  const filteredFeaturedAnimals = safeFeaturedAnimals.filter(
    (animal): animal is Animal => animal !== undefined && animal !== null
  );
  const filteredEvents = safeEvents.filter(
    (event): event is ZooEvent => event !== undefined && event !== null
  );

  const displayAnimals = filteredFeaturedAnimals;
  const displayEvents = filteredEvents.filter((event) => event.id);
  const displayNews = safeNews.filter((item) => item && item.title);
  const isEmpty = displayAnimals.length === 0 && displayEvents.length === 0 && displayNews.length === 0;

  return (
    <ScreenContainer refreshing={refreshing} onRefresh={onRefresh}>
      {isOffline && <OfflineBanner />}

      {header}
      <View style={styles.sectionHeader}>
        <SectionHeader
          title="Animales favoritos"
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
          {displayAnimals.length === 0 ? (
        <Text style={[styles.emptyCopy, styles.favoriteEmpty]}>Marca el corazón en la ficha de un animal para verlo aquí.</Text>
      ) : (
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
      )}

          <View style={styles.newsSection}>
            <View style={styles.refreshHint}>
              <Icon name="refresh" size={16} color={colors.textMuted} />
              <Text style={styles.refreshHintText}>Desliza hacia abajo para actualizar noticias y eventos.</Text>
            </View>
            <HomePreview
              title="Noticias actuales"
              emptyMessage="Aún no hay noticias publicadas"
              items={displayNews}
              seeMoreLabel="Ver más noticias"
              seeAllLabel="Ver todas las noticias en el portal"
              onSeeAll={onSeeAllNewsPress}
              renderItem={(item) => (
                <HighlightNewsCard
                  news={item}
                  onPress={item.id && onNewsPress ? () => onNewsPress(item.id as string) : undefined}
                />
              )}
            />
            <HomePreview
              title="Próximos eventos"
              emptyMessage="Aún no hay eventos vigentes"
              items={displayEvents}
              seeMoreLabel="Ver más eventos"
              seeAllLabel="Ver todos los eventos en el portal"
              onSeeAll={onSeeAllEventsPress}
              renderItem={(item) => (
                <EventCard event={item} onPress={() => onEventPress?.(item.id)} />
              )}
            />
          </View>
        </>
      )}
    </ScreenContainer>
  );
}

function HomeSwitcher({ panel, onChange }: { panel: HomePanel; onChange: (panel: HomePanel) => void }) {
  const tabs: { key: HomePanel; label: string }[] = [
    { key: 'home', label: 'Inicio' },
    { key: 'missions', label: 'Misiones' },
  ];
  return (
    <View style={styles.switcher} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const selected = panel === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.switchTab, selected ? styles.switchTabActive : null]}
          >
            <View style={styles.switchRow}>
              <Icon
                name={tab.key === 'home' ? 'home' : 'emoji-events'}
                size={18}
                color={selected ? colors.text : colors.textMuted}
              />
              <Text style={[styles.switchLabel, selected ? styles.switchLabelActive : null]}>{tab.label}</Text>
            </View>
            <View style={selected ? styles.switchLine : styles.switchLineIdle} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function HomePreview<T extends { id?: string }>({
  title,
  emptyMessage,
  items,
  seeMoreLabel,
  seeAllLabel,
  onSeeAll,
  renderItem,
}: {
  title: string;
  emptyMessage: string;
  items: T[];
  seeMoreLabel: string;
  seeAllLabel: string;
  onSeeAll?: () => void;
  renderItem: (item: T) => React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items.slice(0, 3) : items.slice(0, 1);
  const canToggle = items.length > 1;
  const toggleLabel = expanded ? seeMoreLabel.replace('Ver más', 'Ver menos') : seeMoreLabel;

  return (
    <View style={styles.preview}>
      <SectionHeader title={title} />
      {visible.length === 0 ? (
        <Text style={styles.emptyCopy}>{emptyMessage}</Text>
      ) : (
        visible.map((item, index) => (
          <View key={item.id ?? `${title}-${index}`}>{renderItem(item)}</View>
        ))
      )}
      <View style={styles.previewActions}>
        {canToggle ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={toggleLabel}
            onPress={() => setExpanded((current) => !current)}
            style={[styles.previewButton, styles.previewButtonMore]}
          >
            <Text style={styles.previewButtonText}>{expanded ? 'Ver menos' : 'Ver más'}</Text>
          </TouchableOpacity>
        ) : null}
        {onSeeAll ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={seeAllLabel}
            onPress={onSeeAll}
            style={[styles.previewButton, styles.previewButtonAll]}
          >
            <Text style={styles.previewButtonAllText}>En el portal</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  switcher: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
  },
  switchTab: { flex: 1, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderRadius: radius.pill },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  switchTabActive: { backgroundColor: colors.accent },
  switchLabel: { fontSize: 16, fontWeight: '600' as const, color: colors.textMuted },
  switchLabelActive: { color: colors.text },
  switchLine: { width: 36, height: 3, borderRadius: radius.pill, backgroundColor: colors.primary },
  switchLineIdle: { width: 36, height: 3 },
  sectionHeader: { paddingHorizontal: spacing.lg },
  loadingFill: { flex: 1, justifyContent: 'center' },
  carousel: { paddingHorizontal: spacing.lg, gap: spacing.md, marginVertical: spacing.lg },
  newsSection: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  refreshHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  refreshHintText: { color: colors.textMuted, fontSize: 13, flex: 1 },
  preview: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  previewActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  previewButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  previewButtonMore: { backgroundColor: colors.accent },
  previewButtonAll: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.secondary },
  previewButtonText: { color: colors.textOnAccent, fontWeight: '600' as const },
  previewButtonAllText: { color: colors.text, fontWeight: '600' as const },
  emptyCopy: { color: colors.textMuted, marginBottom: spacing.sm },
  favoriteEmpty: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
});
