import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
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
import { SVG_HEIGHT, SVG_WIDTH } from '../constants/zoo';
import { MapFilter, MapPlace, MapSection, PathNode, ZooPlace } from '../models';
import { colors, radius, spacing } from '../theme/tokens';
import { computeWalkRoute } from '../utils/pathfinding';
import { haversineMeters } from '../utils/haversine';
import { computeGpsBearingDegrees, selectVisibleArPoints } from '../utils/arLocationMath';
import { computeRelativeAngleDegrees, smoothHeadingDegrees } from '../utils/arMath';
import { useArTourViewModel } from '../viewmodels/useArTourViewModel';
import { useMapMarkers, withCanonicalFoodAnchor } from '../viewmodels/useMapMarkers';
import { useMapViewport } from '../viewmodels/useMapViewport';
import type { UserPosition } from '../viewmodels/useLocationViewModel';

interface MapScreenProps {
  sections: MapSection[];
  filteredPlaces: MapPlace[];
  zooPlaces?: ZooPlace[];
  pathNodes?: PathNode[];
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

const emptyZooPlaces: ZooPlace[] = [];

export function MapScreen({
  sections,
  filteredPlaces,
  zooPlaces = emptyZooPlaces,
  pathNodes = [],
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
  const mapViewport = useMapViewport();
  const { scale, panX, panY } = mapViewport.viewport;
  const [placeDetailsExpanded, setPlaceDetailsExpanded] = useState(false);
  // AR dinámico: selección cercana y visitados en sesión (015 enmienda 2026-11-21)
  const [selectedArPointId, setSelectedArPointId] = useState<string | null>(null);
  const [visitedArIds, setVisitedArIds] = useState<Set<string>>(new Set());
  const [arrivedArPoint, setArrivedArPoint] = useState<{ id: string; name: string; kind: 'enclosure' | 'zoo_place'; placeType?: string; description?: string | null } | null>(null);
  const [dismissedArrivalId, setDismissedArrivalId] = useState<string | null>(null);
  const smoothedHeadingRef = useRef<number | null>(null);
  const visibleArIdsRef = useRef<Set<string>>(new Set());

  const targetPlace = destinationPlace ?? selectedPlace;
  const activeTargetPlace = useMemo(() => targetPlace && withCanonicalFoodAnchor(targetPlace), [targetPlace]);

  const walkRoute = useMemo(() => {
    if (!userPosition || !activeTargetPlace) {
      return null;
    }
    return computeWalkRoute(
      { svgX: userPosition.svgX, svgY: userPosition.svgY },
      {
        svgX: activeTargetPlace.mapX * SVG_WIDTH,
        svgY: activeTargetPlace.mapY * SVG_HEIGHT,
      },
    );
  }, [userPosition, activeTargetPlace]);

  const { allMapPins, hitWidths } = useMapMarkers(filteredPlaces, zooPlaces);
  const selectedMarkerId = selectedPlace?.id ?? focusedPlaceId;

  const arTour = useArTourViewModel({
    places: filteredPlaces,
    userPosition,
    activeDestinationPlace: destinationPlace,
    onSelectDestination: onToggleDestination,
  });

  const rawHeading = typeof userPosition?.heading === 'number' ? userPosition.heading : null;
  if (rawHeading == null) {
    smoothedHeadingRef.current = null;
  } else {
    smoothedHeadingRef.current =
      smoothedHeadingRef.current == null
        ? rawHeading
        : smoothHeadingDegrees(smoothedHeadingRef.current, rawHeading, 0.08);
  }
  const stableHeading =
    smoothedHeadingRef.current == null ? null : Math.round(smoothedHeadingRef.current) ;
  const roundedLat = typeof userPosition?.lat === 'number' ? Math.round(userPosition.lat * 10000) / 10000 : null;
  const roundedLon = typeof userPosition?.lon === 'number' ? Math.round(userPosition.lon * 10000) / 10000 : null;

  const arPoints = useMemo(() => {
    if (stableHeading == null || roundedLat == null || roundedLon == null) return [];
    const enclosureTargets = filteredPlaces
      .filter(
        (place) =>
          place.kind === 'animal' &&
          typeof place.gpsLat === 'number' &&
          typeof place.gpsLon === 'number',
      )
      .map((place) => ({
        id: `enclosure-${place.id}`,
        sourceId: place.id,
        name: place.name,
        latitude: place.gpsLat as number,
        longitude: place.gpsLon as number,
        kind: 'enclosure' as const,
        placeType: 'Recinto',
        description: place.description ?? null,
      }));
    const zooPlaceTargets = zooPlaces
      .filter((place) => place.isVisible && typeof place.gpsLat === 'number' && typeof place.gpsLon === 'number')
      .map((place) => ({
        id: `zoo-place-${place.id}`,
        sourceId: place.id,
        name: place.name,
        latitude: place.gpsLat as number,
        longitude: place.gpsLon as number,
        kind: 'zoo_place' as const,
        placeType: place.placeType,
        description: place.description ?? null,
      }));
    const points = selectVisibleArPoints(
      { latitude: roundedLat, longitude: roundedLon },
      stableHeading,
      [...enclosureTargets, ...zooPlaceTargets],
      { previouslyVisibleIds: visibleArIdsRef.current },
    );
    visibleArIdsRef.current = new Set(points.map((p) => p.id));
    return points;
  }, [filteredPlaces, zooPlaces, stableHeading, roundedLat, roundedLon]);

  const nearbyArPoints = useMemo(() => {
    if (roundedLat == null || roundedLon == null) return [];
    const targets = [
      ...filteredPlaces
        .filter((place) => place.kind === 'animal' && typeof place.gpsLat === 'number' && typeof place.gpsLon === 'number')
        .map((place) => ({
          id: `enclosure-${place.id}`,
          sourceId: place.id,
          name: place.name,
          latitude: place.gpsLat as number,
          longitude: place.gpsLon as number,
          kind: 'enclosure' as const,
          placeType: 'Recinto',
          description: place.description ?? null,
        })),
      ...zooPlaces
        .filter((place) => place.isVisible && typeof place.gpsLat === 'number' && typeof place.gpsLon === 'number')
        .map((place) => ({
          id: `zoo-place-${place.id}`,
          sourceId: place.id,
          name: place.name,
          latitude: place.gpsLat as number,
          longitude: place.gpsLon as number,
          kind: 'zoo_place' as const,
          placeType: place.placeType,
          description: place.description ?? null,
        })),
    ];
    return targets
      .map((target) => {
        const distanceMeters = haversineMeters(roundedLat, roundedLon, target.latitude, target.longitude);
        return {
          ...target,
          distanceMeters,
          bearingDegrees: 0,
          relativeBearingDegrees: 0,
          showLabel: distanceMeters <= 50,
        };
      })
      .filter((point) => point.distanceMeters <= 150)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 8);
  }, [filteredPlaces, roundedLat, roundedLon, zooPlaces]);

  const nearbyPathNode = useMemo(() => {
    if (roundedLat == null || roundedLon == null) return null;
    let nearest: { id: string; name: string; nodeType: string; distanceMeters: number; instruction: string | null } | null = null;
    for (const node of pathNodes) {
      if (typeof node.gpsLat !== 'number' || typeof node.gpsLon !== 'number') continue;
      const distanceMeters = haversineMeters(roundedLat, roundedLon, node.gpsLat, node.gpsLon);
      if (distanceMeters > 30) continue;
      if (!nearest || distanceMeters < nearest.distanceMeters) {
        let instruction: string | null = null;
        if (stableHeading != null) {
          const bearing = computeGpsBearingDegrees(
            { latitude: roundedLat, longitude: roundedLon },
            { latitude: node.gpsLat, longitude: node.gpsLon },
          );
          const relative = computeRelativeAngleDegrees(bearing, stableHeading);
          const abs = Math.abs(relative);
          if (abs <= 20) instruction = 'Al frente';
          else if (abs >= 160) instruction = 'Detrás de ti';
          else if (relative > 0) instruction = 'Gira a la derecha';
          else instruction = 'Gira a la izquierda';
        }
        nearest = {
          id: node.id,
          name: node.name?.trim() || `Nodo ${node.nodeType}`,
          nodeType: node.nodeType,
          distanceMeters,
          instruction,
        };
      }
    }
    return nearest;
  }, [pathNodes, roundedLat, roundedLon, stableHeading]);

  useEffect(() => {
    if (!userPosition || !arTour.isTourOpen) return;
    const candidates: Array<{ id: string; name: string; kind: 'enclosure' | 'zoo_place'; placeType?: string; description?: string | null; distance: number }> = [];
    for (const place of filteredPlaces) {
      if (place.kind !== 'animal' || typeof place.gpsLat !== 'number' || typeof place.gpsLon !== 'number') continue;
      const id = `enclosure-${place.id}`;
      if (dismissedArrivalId === id) continue;
      const distance = haversineMeters(userPosition.lat, userPosition.lon, place.gpsLat, place.gpsLon);
      if (distance <= 20) candidates.push({ id, name: place.name, kind: 'enclosure', placeType: 'Recinto', description: place.description ?? null, distance });
    }
    for (const place of zooPlaces) {
      if (!place.isVisible || typeof place.gpsLat !== 'number' || typeof place.gpsLon !== 'number') continue;
      const id = `zoo-place-${place.id}`;
      if (dismissedArrivalId === id) continue;
      const distance = haversineMeters(userPosition.lat, userPosition.lon, place.gpsLat, place.gpsLon);
      if (distance <= 20) candidates.push({ id, name: place.name, kind: 'zoo_place', placeType: place.placeType, description: place.description ?? null, distance });
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const nearest = candidates[0];
    if (!nearest) return;
    setArrivedArPoint((prev) => (prev?.id === nearest.id ? prev : { id: nearest.id, name: nearest.name, kind: nearest.kind, placeType: nearest.placeType, description: nearest.description }));
    setVisitedArIds((prev) => {
      if (prev.has(nearest.id)) return prev;
      const next = new Set(prev);
      next.add(nearest.id);
      return next;
    });
  }, [arTour.isTourOpen, dismissedArrivalId, filteredPlaces, userPosition, zooPlaces]);

  const selectedArPoint = useMemo(
    () => nearbyArPoints.find((point) => point.id === selectedArPointId) ?? null,
    [nearbyArPoints, selectedArPointId],
  );
  const selectedArMapPlace = useMemo(() => {
    if (!selectedArPoint || selectedArPoint.kind !== 'enclosure') return null;
    const sourceId = selectedArPoint.sourceId ?? selectedArPoint.id.replace(/^enclosure-/, '');
    return filteredPlaces.find((place) => place.id === sourceId) ?? null;
  }, [filteredPlaces, selectedArPoint]);
  const selectedArZooPlace = useMemo(() => {
    if (!selectedArPoint || selectedArPoint.kind !== 'zoo_place') return null;
    const sourceId = selectedArPoint.sourceId ?? selectedArPoint.id.replace(/^zoo-place-/, '');
    return zooPlaces.find((place) => place.id === sourceId) ?? null;
  }, [selectedArPoint, zooPlaces]);

  const selectedSectionName =
    sections.find((section) => section.id === selectedPlace?.sectionId)?.name;
  const hasNoPlaces = !isLoading && !error && allMapPins.length === 0;
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
          <View style={styles.infoRow}>
            <AppText variant="small" color="textMuted">
              Toca un punto del mapa para ver su información.
            </AppText>
            {userPosition && (
              <View style={styles.gpsBadge}>
                <AppText variant="caption" style={styles.gpsText}>
                  {`GPS: ${userPosition.lat.toFixed(6)}, ${userPosition.lon.toFixed(6)}`}
                </AppText>
              </View>
            )}
          </View>
        </View>
      )}

      <View style={[styles.mapArea, arTour.isTourOpen && styles.mapAreaFullBleed]}>
        {arrivedAtPlace && onDismissArrival && !arTour.isTourOpen && (
          <ArrivalBanner place={arrivedAtPlace} onDismiss={onDismissArrival} />
        )}

        <View style={styles.canvas}>
          {!arTour.isTourOpen ? (
            <>
              <View
                ref={mapViewport.viewRef}
                collapsable={false}
                testID="map-viewport-gesture-area"
                style={styles.viewportGestureArea}
                onLayout={mapViewport.handleLayout}
                {...mapViewport.panHandlers}
              >
                {selectedPlace && (
                  <Pressable
                    testID="map-clear-selection"
                    accessible={false}
                    importantForAccessibility="no"
                    onPress={onCloseDetail}
                    style={StyleSheet.absoluteFill}
                  />
                )}
                <View
                  testID="map-viewport-content"
                  pointerEvents="box-none"
                  style={[
                    styles.viewportContent,
                    mapViewport.mapSize,
                    {
                      transform: [
                        { translateX: panX },
                        { translateY: panY },
                        { scale },
                      ],
                    },
                  ]}
                >
                  <ZooMapSvg
                    highlightedSectionId={focusedSectionId ?? focusedPlaceId}
                    selectedPlaceId={selectedMarkerId}
                    routeTargetId={userPosition ? activeTargetPlace?.id : null}
                    places={allMapPins}
                  />
                  {userPosition && activeTargetPlace && (
                    <DestinationRouteLine
                      userPosition={userPosition}
                      destinationPlace={activeTargetPlace}
                    />
                  )}
                  {allMapPins.map((place) => (
                    <MapMarker
                      key={place.id}
                      place={place}
                      selected={place.id === selectedMarkerId}
                      hitWidth={hitWidths.get(place.id)}
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

              <MapViewportControls
                zoomScale={scale}
                canCenterLocation={Boolean(userPosition)}
                onZoomIn={mapViewport.zoomIn}
                onZoomOut={mapViewport.zoomOut}
                onResetView={mapViewport.resetView}
                onCenterLocation={() => {
                  if (userPosition) mapViewport.centerLocation(userPosition.svgX, userPosition.svgY);
                }}
              />

              {walkRoute && destinationPlace && (
                <WalkEstimateBadge
                  destinationName={destinationPlace.name}
                  distanceMeters={walkRoute.distanceMeters}
                  estimatedMinutes={walkRoute.estimatedMinutes}
                />
              )}

              <Pressable
                testID="start-ar-tour-button"
                accessibilityRole="button"
                accessibilityLabel="Iniciar AR"
                onPress={arTour.startTour}
                style={styles.tourStartButton}
              >
                <AppText variant="caption" bold color="textOnPrimary">
                  Iniciar AR
                </AppText>
              </Pressable>
            </>
          ) : (
            <View style={styles.arCanvasPlaceholder} />
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
            key={selectedPlace.id}
            place={selectedPlace}
            expanded={placeDetailsExpanded}
            onToggleExpanded={() => setPlaceDetailsExpanded((expanded) => !expanded)}
            sectionName={selectedSectionName}
            isDestination={selectedPlace.id === destinationPlace?.id}
            onClose={onCloseDetail}
            onToggleDestination={onToggleDestination}
          />
        )}
      </View>

      {arTour.isTourOpen && (
        <ArTourOverlay
          arPoints={arPoints}
          nearbyPoints={nearbyArPoints}
          visitedArIds={visitedArIds}
          selectedArPointId={selectedArPointId}
          onSelectArPoint={setSelectedArPointId}
          onClose={() => {
            setSelectedArPointId(null);
            setArrivedArPoint(null);
            arTour.closeTour();
          }}
          hasLocation={Boolean(userPosition)}
          headingAvailable={typeof userPosition?.heading === 'number'}
          lowAccuracy={(userPosition?.accuracy ?? 999) > 35}
          arrivedArPoint={arrivedArPoint}
          onDismissArrival={() => {
            if (arrivedArPoint) {
              setDismissedArrivalId(arrivedArPoint.id);
              setVisitedArIds((prev) => new Set(prev).add(arrivedArPoint.id));
            }
            setArrivedArPoint(null);
          }}
          selectedPlace={selectedArMapPlace}
          selectedZooPlace={selectedArZooPlace}
          nearbyPathNode={nearbyPathNode}
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
  infoRow: {
    gap: 4,
  },
  gpsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.infoSurface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  gpsText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 11,
  },
  mapArea: {
    flex: 1,
    position: 'relative',
    padding: 0,
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
  arCanvasPlaceholder: {
    flex: 1,
    backgroundColor: colors.text,
  },
  viewportGestureArea: {
    flex: 1,
    justifyContent: 'center',
  },
  viewportContent: {
    width: '100%',
    aspectRatio: 1600 / 1200,
    alignSelf: 'center',
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

