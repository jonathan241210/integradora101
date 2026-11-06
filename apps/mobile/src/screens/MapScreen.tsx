import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  Card,
  Chip,
  EmptyView,
  ErrorView,
  LoadingView,
  ScreenContainer,
} from '../components/ui';
import {
  ArrivalBanner,
  DestinationRouteLine,
  MapMarker,
  MapPlaceCard,
  MapViewportControls,
  UserLocationMarker,
  WalkEstimateBadge,
  ZooMapSvg,
} from '../components/map';
import {
  CENTER_LOCATION_ZOOM,
  MIN_ZOOM_SCALE,
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOOM_STEP,
} from '../constants/zoo';
import { MapFilter, MapPlace, MapSection } from '../models';
import { colors, spacing } from '../theme/tokens';
import {
  clampPan,
  clampZoom,
  computeCenterPanForSvgPoint,
} from '../utils/mapViewport';
import { computeWalkRoute } from '../utils/pathfinding';
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
  /** Recinto actualmente fijado como destino (CA-14). */
  destinationPlace?: MapPlace | null;
  /** Recinto al que el usuario acaba de llegar (CA-12). */
  arrivedAtPlace?: MapPlace | null;
  /** Callback para fijar o cancelar el recinto destino. */
  onToggleDestination?: (id: string) => void;
  /** Callback para cerrar el aviso de llegada. */
  onDismissArrival?: () => void;
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
  destinationPlace,
  arrivedAtPlace,
  onToggleDestination,
  onDismissArrival,
}: MapScreenProps) {
  const [zoomScale, setZoomScale] = useState<number>(MIN_ZOOM_SCALE);
  const [panOffset, setPanOffset] = useState<{ panX: number; panY: number }>({
    panX: 0,
    panY: 0,
  });

  const zoomScaleRef = useRef<number>(MIN_ZOOM_SCALE);
  const panOffsetRef = useRef<{ panX: number; panY: number }>({ panX: 0, panY: 0 });
  const dragOriginRef = useRef<{ panX: number; panY: number }>({ panX: 0, panY: 0 });

  const applyViewport = useCallback(
    (nextScale: number, nextPan: { panX: number; panY: number }) => {
      zoomScaleRef.current = nextScale;
      panOffsetRef.current = nextPan;
      setZoomScale(nextScale);
      setPanOffset(nextPan);
    },
    [],
  );

  const handleZoomIn = useCallback(() => {
    const nextScale = clampZoom(zoomScaleRef.current + ZOOM_STEP);
    const nextPan = clampPan(
      panOffsetRef.current.panX,
      panOffsetRef.current.panY,
      nextScale,
    );
    applyViewport(nextScale, nextPan);
  }, [applyViewport]);

  const handleZoomOut = useCallback(() => {
    const nextScale = clampZoom(zoomScaleRef.current - ZOOM_STEP);
    const nextPan = clampPan(
      panOffsetRef.current.panX,
      panOffsetRef.current.panY,
      nextScale,
    );
    applyViewport(nextScale, nextPan);
  }, [applyViewport]);

  const handleResetView = useCallback(() => {
    applyViewport(MIN_ZOOM_SCALE, { panX: 0, panY: 0 });
  }, [applyViewport]);

  const handleCenterLocation = useCallback(() => {
    if (!userPosition) {
      return;
    }
    const currentScale = zoomScaleRef.current;
    const targetScale =
      currentScale > MIN_ZOOM_SCALE ? currentScale : CENTER_LOCATION_ZOOM;
    const nextScale = clampZoom(targetScale);
    const nextPan = computeCenterPanForSvgPoint(
      userPosition.svgX,
      userPosition.svgY,
      nextScale,
    );
    applyViewport(nextScale, nextPan);
  }, [userPosition, applyViewport]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => zoomScaleRef.current > MIN_ZOOM_SCALE,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        zoomScaleRef.current > MIN_ZOOM_SCALE &&
        (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        zoomScaleRef.current > MIN_ZOOM_SCALE &&
        (Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6),
      onPanResponderGrant: () => {
        dragOriginRef.current = { ...panOffsetRef.current };
      },
      onPanResponderMove: (_, gestureState) => {
        const currentScale = zoomScaleRef.current;
        if (currentScale <= MIN_ZOOM_SCALE) {
          return;
        }
        const nextPan = clampPan(
          dragOriginRef.current.panX + gestureState.dx / currentScale,
          dragOriginRef.current.panY + gestureState.dy / currentScale,
          currentScale,
        );
        if (
          nextPan.panX !== panOffsetRef.current.panX ||
          nextPan.panY !== panOffsetRef.current.panY
        ) {
          panOffsetRef.current = nextPan;
          setPanOffset(nextPan);
        }
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  const walkRoute = useMemo(() => {
    if (!userPosition || !destinationPlace) {
      return null;
    }
    return computeWalkRoute(
      { svgX: userPosition.svgX, svgY: userPosition.svgY },
      {
        svgX: destinationPlace.mapX * SVG_WIDTH,
        svgY: destinationPlace.mapY * SVG_HEIGHT,
      },
    );
  }, [userPosition, destinationPlace]);

  const selectedSectionName =
    sections.find((section) => section.id === selectedPlace?.sectionId)?.name ?? 'Sin sección';
  const hasNoPlaces = !isLoading && !error && filteredPlaces.length === 0;
  const showFocusNotice = focusNotFound && !selectedPlace;

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.header}>
        <AppText variant="title">Mapa del zoológico</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Buscar animales" onPress={onSearchPress} style={styles.searchLink}>
          <AppText variant="body" bold style={styles.searchLinkText}>Buscar animales</AppText>
        </Pressable>
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
        {arrivedAtPlace && onDismissArrival && (
          <ArrivalBanner place={arrivedAtPlace} onDismiss={onDismissArrival} />
        )}

        <View style={styles.canvas}>
          <View style={styles.viewportContent} {...panResponder.panHandlers}>
            <View
              testID="map-viewport-content"
              style={[
                styles.viewportContent,
                {
                  transform: [
                    { scale: zoomScale },
                    { translateX: panOffset.panX },
                    { translateY: panOffset.panY },
                  ],
                },
              ]}
            >
              <ZooMapSvg highlightedSectionId={focusedSectionId} />
              {userPosition && destinationPlace && (
                <DestinationRouteLine
                  userPosition={userPosition}
                  destinationPlace={destinationPlace}
                />
              )}
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
          </View>

          <MapViewportControls
            zoomScale={zoomScale}
            canCenterLocation={Boolean(userPosition)}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onResetView={handleResetView}
            onCenterLocation={handleCenterLocation}
          />

          {walkRoute && destinationPlace && (
            <WalkEstimateBadge
              destinationName={destinationPlace.name}
              distanceMeters={walkRoute.distanceMeters}
              estimatedMinutes={walkRoute.estimatedMinutes}
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
            isDestination={selectedPlace.id === destinationPlace?.id}
            onClose={onCloseDetail}
            onToggleDestination={onToggleDestination}
          />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  searchLink: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  searchLinkText: { color: colors.secondary },
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
  viewportContent: {
    width: '100%',
    height: '100%',
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
