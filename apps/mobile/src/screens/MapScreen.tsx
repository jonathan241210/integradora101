import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  CENTER_LOCATION_ZOOM,
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOOM_STEP,
  ZOO_ENTRANCE_SVG,
  isPointInSvgContour,
} from '../constants/zoo';
import { MapFilter, MapPlace, MapSection, PathNode, ZooPlace } from '../models';
import { colors, radius, spacing } from '../theme/tokens';
import {
  clampPan,
  clampZoom,
  computeCenterPanForSvgPoint,
} from '../utils/mapViewport';
import { computeWalkRoute } from '../utils/pathfinding';
import { haversineMeters } from '../utils/haversine';
import { computeGpsBearingDegrees, selectVisibleArPoints } from '../utils/arLocationMath';
import { computeRelativeAngleDegrees, smoothHeadingDegrees } from '../utils/arMath';
import { geoToArAnchorPoints } from '../utils/arGeoAnchor';
import { ViroArAnchorScene } from '../components/map/ViroArAnchorScene';
import { useArTourViewModel } from '../viewmodels/useArTourViewModel';
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
  /** PosiciÃ³n GPS del visitante (null si permiso denegado o no disponible). */
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

const noopPlacePress = (_id: string) => {};

export function MapScreen({
  sections,
  filteredPlaces,
  zooPlaces = [],
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
  const [zoomScale, setZoomScale] = useState<number>(2.2);
  const [panOffset, setPanOffset] = useState<{ panX: number; panY: number }>({
    panX: 0,
    panY: 0,
  });
  // AR dinÃ¡mico: selecciÃ³n cercana y visitados en sesiÃ³n (015 enmienda 2026-11-21)
  const [selectedArPointId, setSelectedArPointId] = useState<string | null>(null);
  const [visitedArIds, setVisitedArIds] = useState<Set<string>>(new Set());
  const [arrivedArPoint, setArrivedArPoint] = useState<{ id: string; name: string; kind: 'enclosure' | 'zoo_place'; placeType?: string; description?: string | null } | null>(null);
  const [dismissedArrivalId, setDismissedArrivalId] = useState<string | null>(null);
  const [showNativeArPoc, setShowNativeArPoc] = useState(false);
  const [mapLayout, setMapLayout] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const zoomScaleRef = useRef<number>(2.2);
  zoomScaleRef.current = zoomScale;

  const panOffsetRef = useRef<{ panX: number; panY: number }>({
    panX: 0,
    panY: 0,
  });
  panOffsetRef.current = panOffset;
  const smoothedHeadingRef = useRef<number | null>(null);
  const visibleArIdsRef = useRef<Set<string>>(new Set());
  const hasCenteredOnEntranceRef = useRef(false);

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
    setZoomScale(2.2);
    zoomScaleRef.current = 2.2;
    setPanOffset({ panX: 0, panY: 0 });
  }, []);

  const handleCenterLocation = useCallback(() => {
    if (!userPosition) {
      return;
    }
    const centerZoom = clampZoom(CENTER_LOCATION_ZOOM);
    zoomScaleRef.current = centerZoom;
    setZoomScale(centerZoom);
    const centerPan = computeCenterPanForSvgPoint(
      userPosition.svgX,
      userPosition.svgY,
      centerZoom,
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

  const activeTargetPlace = destinationPlace ?? selectedPlace;

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

  const zooPlaceMarkers = useMemo(
    () =>
      zooPlaces
        .filter((place) => place.isVisible && typeof place.mapX === 'number' && typeof place.mapY === 'number')
        .map((place) => ({
          id: `zoo-place-${place.id}`,
          name: place.name,
          kind: 'zoo_place' as const,
          sectionId: place.svgId ?? `zoo-place-${place.id}`,
          description: place.description ?? place.placeType,
          mapX: place.mapX as number,
          mapY: place.mapY as number,
          visible: true,
          gpsLat: typeof place.gpsLat === 'number' ? place.gpsLat : undefined,
          gpsLon: typeof place.gpsLon === 'number' ? place.gpsLon : undefined,
          svgId: place.svgId ?? undefined,
        })),
    [zooPlaces],
  );

  const isInsideZooContour = useCallback((_mapX: number, _mapY: number) => {
    // Contorno desactivado temporalmente: los puntos con map_x/map_y se muestran en su posición del SVG.
    return true;
  }, []);

  const shouldApplyContourFilter = useCallback((place: MapPlace) => /^\d+$/.test(place.id) || place.id.startsWith('zoo-place-'), []);
  const mockFixedServiceIds = useMemo(() => new Set(['restrooms', 'food', 'main-entrance']), []);

  const visibleFilteredPlaces = useMemo(
    () =>
      filteredPlaces.filter((p) => {
        if (zooPlaces.length > 0 && mockFixedServiceIds.has(p.id)) return false;
        return !shouldApplyContourFilter(p) || isInsideZooContour(p.mapX, p.mapY);
      }),
    [filteredPlaces, isInsideZooContour, shouldApplyContourFilter, zooPlaces.length, mockFixedServiceIds],
  );
  const visibleZooPlaceMarkers = useMemo(
    () => zooPlaceMarkers.filter((p) => !shouldApplyContourFilter(p) || isInsideZooContour(p.mapX, p.mapY)),
    [zooPlaceMarkers, isInsideZooContour, shouldApplyContourFilter],
  );

  const allMapPins = useMemo(
    () => [...visibleFilteredPlaces, ...visibleZooPlaceMarkers] as MapPlace[],
    [visibleFilteredPlaces, visibleZooPlaceMarkers],
  );

  const mapContentSize = useMemo(() => {
    if (mapLayout.width <= 0 || mapLayout.height <= 0) return null;
    const aspect = SVG_WIDTH / SVG_HEIGHT;
    let width = mapLayout.width;
    let height = width / aspect;
    if (height > mapLayout.height) {
      height = mapLayout.height;
      width = height * aspect;
    }
    return { width, height };
  }, [mapLayout.height, mapLayout.width]);

  useEffect(() => {
    if (hasCenteredOnEntranceRef.current || !mapContentSize) return;
    hasCenteredOnEntranceRef.current = true;
    const centerPan = computeCenterPanForSvgPoint(
      ZOO_ENTRANCE_SVG.svgX,
      ZOO_ENTRANCE_SVG.svgY,
      zoomScaleRef.current,
    );
    setPanOffset(centerPan);
  }, [mapContentSize]);

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
          else if (abs >= 160) instruction = 'DetrÃ¡s de ti';
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

  const nativeArAnchors = useMemo(() => {
    if (!showNativeArPoc || roundedLat == null || roundedLon == null) return [];
    return geoToArAnchorPoints(
      { latitude: roundedLat, longitude: roundedLon },
      [
        ...filteredPlaces
          .filter((place) => place.kind === 'animal' && typeof place.gpsLat === 'number' && typeof place.gpsLon === 'number')
          .map((place) => ({ id: `enclosure-${place.id}`, name: place.name, latitude: place.gpsLat as number, longitude: place.gpsLon as number, kind: 'enclosure' as const })),
        ...zooPlaces
          .filter((place) => place.isVisible && typeof place.gpsLat === 'number' && typeof place.gpsLon === 'number')
          .map((place) => ({ id: `zoo-place-${place.id}`, name: place.name, latitude: place.gpsLat as number, longitude: place.gpsLon as number, kind: 'zoo_place' as const })),
      ],
      { maxDistanceMeters: 150, maxPoints: 12 },
    );
  }, [filteredPlaces, roundedLat, roundedLon, showNativeArPoc, zooPlaces]);

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
    () => arPoints.find((point) => point.id === selectedArPointId) ?? null,
    [arPoints, selectedArPointId],
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
    sections.find((section) => section.id === selectedPlace?.sectionId)?.name ?? 'Sin secciÃ³n';
  const hasNoPlaces = !isLoading && !error && filteredPlaces.length === 0;
  const showFocusNotice = focusNotFound && !selectedPlace;

  return (
    <ScreenContainer scroll={false}>
      {!arTour.isTourOpen && (
        <View style={styles.header}>
          <AppText variant="title">Mapa del zoolÃ³gico</AppText>
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
              Toca un punto del mapa para ver su informaciÃ³n.
            </AppText>
            {userPosition && (
              <View style={styles.gpsBadge}>
                <AppText variant="caption" style={styles.gpsText}>
                  {`ðŸ“ GPS: ${userPosition.lat.toFixed(6)}, ${userPosition.lon.toFixed(6)}`}
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
                style={styles.viewportGestureArea}
                onLayout={(e) => {
                  const { width, height } = e.nativeEvent.layout;
                  setMapLayout((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
                }}
                {...panResponder.panHandlers}
              >
                <View
                  testID="map-viewport-content"
                  style={[
                    styles.viewportContent,
                    mapContentSize ? { width: mapContentSize.width, height: mapContentSize.height } : null,
                    {
                      transform: [
                        { scale: zoomScale },
                        { translateX: panOffset.panX },
                        { translateY: panOffset.panY },
                      ],
                    },
                  ]}
                >
                  <ZooMapSvg highlightedSectionId={focusedSectionId ?? focusedPlaceId} places={allMapPins} />
                  {userPosition && activeTargetPlace && (
                    <DestinationRouteLine
                      userPosition={userPosition}
                      destinationPlace={activeTargetPlace}
                    />
                  )}
                  {visibleFilteredPlaces.map((place) => (
                    <MapMarker
                      key={place.id}
                      place={place}
                      selected={place.id === focusedPlaceId}
                      onPress={onSelectPlace}
                    />
                  ))}
                  {visibleZooPlaceMarkers.map((place) => (
                    <MapMarker
                      key={place.id}
                      place={place}
                      selected={false}
                      onPress={noopPlacePress}
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
            <LoadingView message="Cargando mapa del zoolÃ³gico..." />
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
          arPoints={arPoints}
          nearbyPoints={nearbyArPoints}
          visitedArIds={visitedArIds}
          selectedArPointId={selectedArPointId}
          onSelectArPoint={setSelectedArPointId}
          onClose={() => {
            setSelectedArPointId(null);
            setArrivedArPoint(null);
            setShowNativeArPoc(false);
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
          onOpenNativeArPoc={() => setShowNativeArPoc(true)}
        />
      )}

      {arTour.isTourOpen && showNativeArPoc && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <ViroArAnchorScene
            anchors={nativeArAnchors}
            onClose={() => setShowNativeArPoc(false)}
          />
        </View>
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

