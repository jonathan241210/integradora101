import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import {
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOO_ENTRANCE_SVG,
} from '../constants/zoo';
import { SVG_UNIT_TO_METERS } from '../constants/zooPaths';
import { MapPlace } from '../models';
import { haversineMeters } from '../utils/haversine';
import {
  ArGuidanceResult,
  computeArGuidance,
  computeBearingDegrees,
  computeRelativeAngleDegrees,
  smoothHeadingDegrees,
} from '../utils/arMath';
import { computeWalkRoute, SvgPoint, WalkRouteResult } from '../utils/pathfinding';
import {
  buildSequentialTour,
  computeTourForks,
  TourForkBranch,
} from '../utils/tourPlanner';
import type { UserPosition } from './useLocationViewModel';

export type ArVisualMode = 'camera-ar' | 'scene-3d';

interface UseArTourViewModelParams {
  places: MapPlace[];
  userPosition?: UserPosition | null;
  activeDestinationPlace?: MapPlace | null;
  onSelectDestination?: (placeId: string) => void;
}

const MANUAL_ROTATION_STEP_DEGREES = 25;
const PROXIMITY_THRESHOLD_METERS = 20;
const ARRIVAL_THRESHOLD_METERS = 8;

export function useArTourViewModel({
  places,
  userPosition,
  activeDestinationPlace,
  onSelectDestination,
}: UseArTourViewModelParams) {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [visualMode, setVisualMode] = useState<ArVisualMode>('camera-ar');
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [visitedStopIds, setVisitedStopIds] = useState<string[]>([]);
  const [manualHeading, setManualHeading] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [dismissedStopId, setDismissedStopId] = useState<string | null>(null);
  const hasVibratedRef = useRef<string | null>(null);

  const deviceHeading =
    typeof userPosition?.heading === 'number' ? userPosition.heading : null;

  // Si el giroscopio/brújula del dispositivo está disponible, guía con la orientación física en tiempo real
  const effectiveHeading = useMemo(() => {
    if (deviceHeading != null) {
      return (deviceHeading + manualHeading + 360) % 360;
    }
    return (manualHeading + 360) % 360;
  }, [deviceHeading, manualHeading]);

  const originSvg: SvgPoint = useMemo(
    () =>
      userPosition
        ? { svgX: userPosition.svgX, svgY: userPosition.svgY }
        : { ...ZOO_ENTRANCE_SVG },
    [userPosition],
  );

  const tourStops = useMemo(
    () => buildSequentialTour(places, ZOO_ENTRANCE_SVG),
    [places],
  );

  const safeStopIndex =
    tourStops.length === 0
      ? 0
      : Math.min(Math.max(0, currentStopIndex), tourStops.length - 1);

  const currentStop: MapPlace | null = tourStops[safeStopIndex] ?? null;

  const walkRoute: WalkRouteResult | null = useMemo(() => {
    if (!currentStop) {
      return null;
    }
    return computeWalkRoute(originSvg, {
      svgX: currentStop.mapX * SVG_WIDTH,
      svgY: currentStop.mapY * SVG_HEIGHT,
    });
  }, [originSvg, currentStop]);

  const guidance: ArGuidanceResult | null = useMemo(() => {
    if (!walkRoute) {
      return null;
    }
    return computeArGuidance(
      originSvg,
      walkRoute.points,
      effectiveHeading,
      animationPhase,
    );
  }, [originSvg, walkRoute, effectiveHeading, animationPhase]);

  const forkBranches: TourForkBranch[] = useMemo(() => {
    if (!currentStop) {
      return [];
    }
    return computeTourForks(
      originSvg,
      currentStop,
      places,
      effectiveHeading,
    );
  }, [originSvg, currentStop, places, effectiveHeading]);

  // Distancia mínima por GPS, euclidiana en mapa o por sendero al recinto activo
  const proximityDistanceMeters = useMemo(() => {
    if (!currentStop) {
      return null;
    }
    let gpsMeters = 999999;
    if (
      userPosition &&
      currentStop.gpsLat !== undefined &&
      currentStop.gpsLon !== undefined
    ) {
      gpsMeters = haversineMeters(
        userPosition.lat,
        userPosition.lon,
        currentStop.gpsLat,
        currentStop.gpsLon,
      );
    }
    const directMeters =
      Math.hypot(
        originSvg.svgX - currentStop.mapX * SVG_WIDTH,
        originSvg.svgY - currentStop.mapY * SVG_HEIGHT,
      ) * SVG_UNIT_TO_METERS;
    const routeMeters = walkRoute?.distanceMeters ?? directMeters;
    return Math.min(gpsMeters, directMeters, routeMeters);
  }, [currentStop, originSvg, walkRoute, userPosition]);

  // Detección de llegada al recinto (<= 8 metros)
  const isArrived = useMemo(() => {
    if (!currentStop || proximityDistanceMeters == null) {
      return false;
    }
    return proximityDistanceMeters <= ARRIVAL_THRESHOLD_METERS;
  }, [currentStop, proximityDistanceMeters]);

  // Alerta háptica/vibración de llegada al recinto en la vista AR
  useEffect(() => {
    if (isArrived && currentStop && hasVibratedRef.current !== currentStop.id) {
      hasVibratedRef.current = currentStop.id;
      try {
        Vibration.vibrate([0, 200, 100, 200]);
      } catch {
        // En plataformas sin motor háptico continúa silenciosamente
      }
    }
  }, [isArrived, currentStop]);

  // Mostrar tarjeta interactiva con datos del animal cuando el usuario se acerca o llega al recinto
  const showProximityCard = useMemo(() => {
    if (!currentStop || proximityDistanceMeters == null) {
      return false;
    }
    const isNear = proximityDistanceMeters <= PROXIMITY_THRESHOLD_METERS;
    return (
      (isNear || isArrived) &&
      dismissedStopId !== currentStop.id
    );
  }, [currentStop, proximityDistanceMeters, isArrived, dismissedStopId]);

  const dismissProximityCard = useCallback(() => {
    if (currentStop) {
      setDismissedStopId(currentStop.id);
    }
  }, [currentStop]);

  const alignToStop = useCallback(
    (stop: MapPlace | null) => {
      if (!stop) {
        return;
      }
      const route = computeWalkRoute(originSvg, {
        svgX: stop.mapX * SVG_WIDTH,
        svgY: stop.mapY * SVG_HEIGHT,
      });
      const nextPt = route.points[1] ?? route.points[0] ?? originSvg;
      const targetBearing = computeBearingDegrees(originSvg, nextPt);

      if (deviceHeading != null) {
        // Compensación relativa al rumbo actual del giroscopio
        const offset = computeRelativeAngleDegrees(targetBearing, deviceHeading);
        setManualHeading(offset);
      } else {
        setManualHeading(targetBearing);
      }
    },
    [originSvg, deviceHeading],
  );

  const startTour = useCallback(() => {
    let initialIdx = 0;
    if (activeDestinationPlace) {
      const foundIdx = tourStops.findIndex(
        (stop) => stop.id === activeDestinationPlace.id,
      );
      if (foundIdx >= 0) {
        initialIdx = foundIdx;
      }
    }
    setCurrentStopIndex(initialIdx);
    setDismissedStopId(null);
    hasVibratedRef.current = null;
    const firstStop = tourStops[initialIdx] ?? null;
    alignToStop(firstStop);
    if (firstStop && onSelectDestination && activeDestinationPlace?.id !== firstStop.id) {
      onSelectDestination(firstStop.id);
    }
    setIsTourOpen(true);
  }, [activeDestinationPlace, tourStops, alignToStop, onSelectDestination]);

  const closeTour = useCallback(() => {
    setIsTourOpen(false);
  }, []);

  const nextStop = useCallback(() => {
    if (tourStops.length === 0) {
      return;
    }
    if (currentStop) {
      setVisitedStopIds((prev) =>
        prev.includes(currentStop.id) ? prev : [...prev, currentStop.id],
      );
    }
    const nextIdx = (safeStopIndex + 1) % tourStops.length;
    setCurrentStopIndex(nextIdx);
    setDismissedStopId(null);
    hasVibratedRef.current = null;
    const nextPlace = tourStops[nextIdx] ?? null;
    alignToStop(nextPlace);
    if (nextPlace && onSelectDestination && activeDestinationPlace?.id !== nextPlace.id) {
      onSelectDestination(nextPlace.id);
    }
  }, [
    tourStops,
    currentStop,
    safeStopIndex,
    alignToStop,
    onSelectDestination,
    activeDestinationPlace,
  ]);

  const prevStop = useCallback(() => {
    if (tourStops.length === 0) {
      return;
    }
    const prevIdx = (safeStopIndex - 1 + tourStops.length) % tourStops.length;
    setCurrentStopIndex(prevIdx);
    setDismissedStopId(null);
    hasVibratedRef.current = null;
    const prevPlace = tourStops[prevIdx] ?? null;
    alignToStop(prevPlace);
    if (prevPlace && onSelectDestination && activeDestinationPlace?.id !== prevPlace.id) {
      onSelectDestination(prevPlace.id);
    }
  }, [
    tourStops,
    safeStopIndex,
    alignToStop,
    onSelectDestination,
    activeDestinationPlace,
  ]);

  const selectForkStop = useCallback(
    (placeId: string) => {
      const foundIdx = tourStops.findIndex((stop) => stop.id === placeId);
      if (foundIdx < 0) {
        return;
      }
      setCurrentStopIndex(foundIdx);
      setDismissedStopId(null);
      hasVibratedRef.current = null;
      const chosenPlace = tourStops[foundIdx] ?? null;
      alignToStop(chosenPlace);
      if (chosenPlace && onSelectDestination && activeDestinationPlace?.id !== chosenPlace.id) {
        onSelectDestination(chosenPlace.id);
      }
    },
    [tourStops, alignToStop, onSelectDestination, activeDestinationPlace],
  );

  const rotateLeft = useCallback(() => {
    setManualHeading((prev) =>
      smoothHeadingDegrees(prev, prev - MANUAL_ROTATION_STEP_DEGREES, 1),
    );
  }, []);

  const rotateRight = useCallback(() => {
    setManualHeading((prev) =>
      smoothHeadingDegrees(prev, prev + MANUAL_ROTATION_STEP_DEGREES, 1),
    );
  }, []);

  const alignFront = useCallback(() => {
    alignToStop(currentStop);
  }, [alignToStop, currentStop]);

  const toggleVisualMode = useCallback(() => {
    setVisualMode((prev) => (prev === 'camera-ar' ? 'scene-3d' : 'camera-ar'));
  }, []);

  const stepAnimation = useCallback(() => {
    setAnimationPhase((prev) => (prev + 0.25) % 1);
  }, []);

  return {
    isTourOpen,
    visualMode,
    headingDegrees: effectiveHeading,
    tourStops,
    currentStopIndex: safeStopIndex,
    currentStop,
    visitedStopIds,
    walkRoute,
    guidance,
    forkBranches,
    proximityDistanceMeters,
    isArrived,
    showProximityCard,
    dismissProximityCard,
    startTour,
    closeTour,
    nextStop,
    prevStop,
    selectForkStop,
    rotateLeft,
    rotateRight,
    alignFront,
    toggleVisualMode,
    stepAnimation,
  };
}
