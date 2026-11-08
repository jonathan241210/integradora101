import React, { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, Pressable } from 'react-native';
import { ArrivalBanner } from '../components/map/ArrivalBanner';
import { DestinationRouteLine } from '../components/map/DestinationRouteLine';
import { MapMarker } from '../components/map/MapMarker';
import { MapPlaceCard } from '../components/map/MapPlaceCard';
import { MapViewportControls } from '../components/map/MapViewportControls';
import { WalkEstimateBadge } from '../components/map/WalkEstimateBadge';
import { ZooMapSvg } from '../components/map/ZooMapSvg';
import { ArTourOverlay } from '../components/map/ArTourOverlay';
import { UserLocationMarker } from '../components/map/UserLocationMarker';
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
  MAX_ZOOM_SCALE,
  MIN_ZOOM_SCALE,
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOOM_STEP,
} from '../constants/zoo';
import { MapFilter, MapPlace, MapSection } from '../models';
import { colors, radius, spacing } from '../theme/tokens';
import {
  clampPan,
  clampZoom,
  computeCenterPanForSvgPoint,
} from '../utils/mapViewport';
import { computeWalkRoute } from '../utils/pathfinding';
import { useArTourViewModel } from '../viewmodels/useArTourViewModel';
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
  zoomScaleRef.current = zoomScale;

  const panOffsetRef = useRef<{ panX: number; panY: number }>({
    panX: 0,
    panY: 0,
  });
  panOffsetRef.current = panOffset;

  const applyPan = useCallback((nextPanX: number, nextPanY: number) => {
    const clamped = clampPan(nextPanX, nextPanY, zoomScaleRef.current);
    setPanOffset(clamped);
  }, []);

  const applyZoom = useCallback((nextZoom: number) => {
    const clampedZoom = clampZoom(nextZoom);
    zoomScaleRef.current = clampedZoom;
    setZoomScale(clampedZoom);

    const clampedPan = clampPan(
      panOffsetRef.current.panX,
      panOffsetRef.current.panY,
      clampedZoom,
    );
    setPanOffset(clampedPan);
  }, []);

  const handleZoomIn = useCallback(() => {
    applyZoom(zoomScaleRef.current + ZOOM_STEP);
  }, [applyZoom]);

  const handleZoomOut = useCallback(() => {
    applyZoom(zoomScaleRef.current - ZOOM_STEP);
  }, [applyZoom]);

  const handleResetView = useCallback(() => {
    setZoomScale(MIN_ZOOM_SCALE);
    setPanOffset({ panX: 0, panY: 0 });
  }, []);

  const handleCenterLocation = useCallback(() => {
    if (!userPosition) {
      return;
    }
    const centerPan = computeCenterPanForSvgPoint(
      userPosition.svgX,
      userPosition.svgY,
      zoomScaleRef.current,
    );
    setPanOffset(centerPan);
  }, [userPosition]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.dy) > 2,
        onPanResponderGrant: () => {
          panOffsetRef.current = panOffset;
        },
        onPanResponderMove: (_, gestureState) => {
          const nextPanX = panOffsetRef.current.panX + gestureState.dx;
          const nextPanY = panOffsetRef.current.panY + gestureState.dy;
          applyPan(nextPanX, nextPanY);
        },
      }),
    [applyPan, panOffset],
  );

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

  const arTour = useArTourViewModel({
    places: filteredPlaces,
    userPosition,
    activeDestinationPlace: destinationPlace,
    onSelectDestination: onToggleDestination,
  });

  const selectedSectionName =
    sections.find((section) => section.id === selectedPlace?.sectionId)?.name ?? 'Sin sección';
  const hasNoPlaces = !isLoading && !error && filteredPlaces.length === 0;
  const showFocusNotice = focusNotFound && !selectedPlace;

  return (
    <ScreenContainer scroll={false}>
      {!arTour.isTourOpen && (
        <View style={styles.header}>
          <AppText variant="title">Mapa del zoológico</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Buscar animales"
            onPress={onSearchPress}
            style={styles.searchLink}
          >
            <AppText variant="body" bold style={styles.searchLinkText}>
              Buscar animales
            </AppText>
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
      )}

      <View style={[styles.mapArea, arTour.isTourOpen && styles.mapAreaFullBleed]}>
        {arrivedAtPlace && onDismissArrival && !arTour.isTourOpen && (
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
                  heading={userPosition.heading}
                />
              )}
            </View>
          </View>

          {!arTour.isTourOpen && (
            <MapViewportControls
              zoomScale={zoomScale}
              canCenterLocation={Boolean(userPosition)}
              onZoomIn={handleZoomIn}
              onZoomOut={handleZoomOut}
              onResetView={handleResetView}
              onCenterLocation={handleCenterLocation}
            />
          )}

          {!arTour.isTourOpen && walkRoute && destinationPlace && (
            <WalkEstimateBadge
              destinationName={destinationPlace.name}
              distanceMeters={walkRoute.distanceMeters}
              estimatedMinutes={walkRoute.estimatedMinutes}
            />
          )}

          {!arTour.isTourOpen && (
            <Pressable
              testID="start-ar-tour-button"
              accessibilityRole="button"
              accessibilityLabel="Iniciar Recorrido 3D"
              onPress={arTour.startTour}
              style={styles.tourStartButton}
            >
              <AppText variant="caption" bold color="textOnPrimary">
                Iniciar Recorrido 3D
              </AppText>
            </Pressable>
          )}
        </View>

        {!arTour.isTourOpen && isLoading && (
          <Card style={styles.stateCard}>
            <LoadingView message="Cargando mapa del zoológico..." />
          </Card>
        )}

        {!arTour.isTourOpen && error && (
          <Card style={styles.stateCard}>
            <ErrorView
              title="No se pudo cargar el mapa"
              message={error}
              onRetry={onRetry}
            />
          </Card>
        )}

        {!arTour.isTourOpen && hasNoPlaces && (
          <Card style={styles.stateCard}>
            <EmptyView
              title="No hay puntos para este filtro"
              message="Prueba con otro filtro para ver los puntos disponibles."
            />
          </Card>
        )}

        {!arTour.isTourOpen && showFocusNotice && (
          <Card style={styles.noticeCard}>
            <AppText variant="small" color="textMuted">
              No encontramos ese destino en el mapa.
            </AppText>
          </Card>
        )}

        {!arTour.isTourOpen && selectedPlace && (
          <MapPlaceCard
            place={selectedPlace}
            sectionName={selectedSectionName}
            isDestination={selectedPlace.id === destinationPlace?.id}
            onClose={onCloseDetail}
            onToggleDestination={onToggleDestination}
          />
        )}
      </View>

      {arTour.isTourOpen && (
        <ArTourOverlay
          visualMode={arTour.visualMode}
          currentStopIndex={arTour.currentStopIndex}
          totalStops={arTour.tourStops.length}
          currentStop={arTour.currentStop}
          walkRoute={arTour.walkRoute}
          guidance={arTour.guidance}
          forkBranches={arTour.forkBranches}
          onClose={arTour.closeTour}
          onToggleVisualMode={arTour.toggleVisualMode}
          onNextStop={arTour.nextStop}
          onPrevStop={arTour.prevStop}
          onSelectForkStop={arTour.selectForkStop}
          onRotateLeft={arTour.rotateLeft}
          onRotateRight={arTour.rotateRight}
          onAlignFront={arTour.alignFront}
          onStepAnimation={arTour.stepAnimation}
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  searchLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  searchLinkText: {
    color: colors.secondary,
  },
  filters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    padding: spacing.md,
  },
  mapAreaFullBleed: {
    padding: 0,
  },
  canvas: {
    flex: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  viewportContent: {
    width: '100%',
    height: '100%',
  },
  tourStartButton: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    elevation: 3,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  stateCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  noticeCard: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    padding: spacing.sm,
  },
});
