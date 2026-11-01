import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyView,
  ErrorView,
  LoadingView,
  ScreenContainer,
} from '../components/ui';
import { MapMarker, MapPlaceCard, UserLocationMarker, ZooMapSvg } from '../components/map';
import { MapFilter, MapPlace, MapSection } from '../models';
import { colors, spacing } from '../theme/tokens';
import type { UserPosition } from '../viewmodels/useLocationViewModel';

interface MapScreenProps {
  sections: MapSection[];
  filteredPlaces: MapPlace[];
  filter: MapFilter;
  selectedPlace: MapPlace | null;
  focusedSectionId: string | null;
  focusedPlaceId: string | null;
  focusNotFound: boolean;
  isLoading: boolean;
  error: string | null;
  onFilterChange: (filter: MapFilter) => void;
  onSelectPlace: (id: string) => void;
  onCloseDetail: () => void;
  onRetry: () => void;
  onSearchPress: () => void;
  /** Posición GPS del visitante (null si permiso denegado o no disponible). */
  userPosition?: UserPosition | null;
}

const filters: { key: MapFilter; label: string }[] = [
  { key: 'all', label: 'Todo' },
  { key: 'animal', label: 'Animales' },
  { key: 'service', label: 'Servicios' },
];

export function MapScreen({
  sections,
  filteredPlaces,
  filter,
  selectedPlace,
  focusedSectionId,
  focusedPlaceId,
  focusNotFound,
  isLoading,
  error,
  onFilterChange,
  onSelectPlace,
  onCloseDetail,
  onRetry,
  onSearchPress,
  userPosition,
}: MapScreenProps) {
  const selectedSectionName =
    sections.find((section) => section.id === selectedPlace?.sectionId)?.name ?? 'Sin sección';
  const hasNoPlaces = !isLoading && !error && filteredPlaces.length === 0;
  const showFocusNotice = focusNotFound && !selectedPlace;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <AppText variant="title">Mapa del zoológico</AppText>
        <Button label="Buscar animales" variant="soft" onPress={onSearchPress} />
        <View style={styles.filters}>
          {filters.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={filter === item.key}
              onPress={() => onFilterChange(item.key)}
            />
          ))}
        </View>
        <AppText variant="small" color="textMuted">
          Toca un punto del mapa para ver su información.
        </AppText>
      </View>

      <View style={styles.mapArea}>
        <View style={styles.canvas}>
          <ZooMapSvg highlightedSectionId={focusedSectionId} />
          {filteredPlaces.map((place) => (
            <MapMarker
              key={place.id}
              place={place}
              selected={place.id === focusedPlaceId}
              onPress={onSelectPlace}
            />
          ))}
          {userPosition && (
            <UserLocationMarker
              svgX={userPosition.svgX}
              svgY={userPosition.svgY}
              searching={userPosition.searching}
            />
          )}
        </View>

        {isLoading && (
          <Card style={styles.stateCard}>
            <LoadingView message="Cargando mapa del zoológico..." />
          </Card>
        )}

        {error && (
          <Card style={styles.stateCard}>
            <ErrorView
              title="No se pudo cargar el mapa"
              message={error}
              onRetry={onRetry}
            />
          </Card>
        )}

        {hasNoPlaces && (
          <Card style={styles.stateCard}>
            <EmptyView
              title="No hay puntos para este filtro"
              message="Prueba con otro filtro para ver los puntos disponibles."
            />
          </Card>
        )}

        {showFocusNotice && (
          <Card style={styles.noticeCard}>
            <AppText variant="small" color="textMuted">
              No encontramos ese destino en el mapa.
            </AppText>
          </Card>
        )}

        {selectedPlace && (
          <MapPlaceCard
            place={selectedPlace}
            sectionName={selectedSectionName}
            onClose={onCloseDetail}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  canvas: {
    width: '100%',
    maxWidth: 620,
    aspectRatio: 1000 / 1400,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  stateCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.lg,
  },
  noticeCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    top: spacing.lg,
  },
});
