import { useCallback, useMemo, useState } from 'react';
import {
  SVG_HEIGHT,
  SVG_WIDTH,
  ZOO_ENTRANCE_SVG,
} from '../constants/zoo';
import { MapPlace } from '../models';
import {
  ArGuidanceResult,
  computeArGuidance,
  computeBearingDegrees,
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
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [animationPhase, setAnimationPhase] = useState(0);

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
      headingDegrees,
      animationPhase,
    );
  }, [originSvg, walkRoute, headingDegrees, animationPhase]);

  const forkBranches: TourForkBranch[] = useMemo(() => {
    if (!currentStop) {
      return [];
    }
    return computeTourForks(
      originSvg,
      currentStop,
      places,
      headingDegrees,
    );
  }, [originSvg, currentStop, places, headingDegrees]);

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
      setHeadingDegrees(targetBearing);
    },
    [originSvg],
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
      const chosenPlace = tourStops[foundIdx] ?? null;
      alignToStop(chosenPlace);
      if (chosenPlace && onSelectDestination && activeDestinationPlace?.id !== chosenPlace.id) {
        onSelectDestination(chosenPlace.id);
      }
    },
    [tourStops, alignToStop, onSelectDestination, activeDestinationPlace],
  );

  const rotateLeft = useCallback(() => {
    setHeadingDegrees((prev) =>
      smoothHeadingDegrees(prev, prev - MANUAL_ROTATION_STEP_DEGREES, 1),
    );
  }, []);

  const rotateRight = useCallback(() => {
    setHeadingDegrees((prev) =>
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
    headingDegrees,
    tourStops,
    currentStopIndex: safeStopIndex,
    currentStop,
    visitedStopIds,
    walkRoute,
    guidance,
    forkBranches,
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
