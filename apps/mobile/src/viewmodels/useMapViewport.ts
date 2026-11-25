import { useCallback, useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent, PanResponderGestureState } from 'react-native';
import { CENTER_LOCATION_ZOOM, INITIAL_MAP_ZOOM, ZOOM_STEP, ZOO_ENTRANCE_SVG } from '../constants/zoo';
import { centerMap, fitMap, transformMap } from '../utils/mapViewport';
import type { MapPoint, MapSize, MapViewport } from '../utils/mapViewport';

const initialViewport = { scale: INITIAL_MAP_ZOOM, panX: 0, panY: 0 };
const center = { x: 0, y: 0 };

function readGesture(event: GestureResponderEvent, origin: MapPoint) {
  const [first, second] = event.nativeEvent.touches;
  if (!first) return null;

  const x = second ? (first.pageX + second.pageX) / 2 : first.pageX;
  const y = second ? (first.pageY + second.pageY) / 2 : first.pageY;
  return {
    point: { x: x - origin.x, y: y - origin.y },
    distance: second ? Math.hypot(first.pageX - second.pageX, first.pageY - second.pageY) : 0,
    firstId: first.identifier,
    secondId: second?.identifier,
  };
}

function shouldCapture(event: GestureResponderEvent, gesture: PanResponderGestureState) {
  return event.nativeEvent.touches.length >= 2 || Math.hypot(gesture.dx, gesture.dy) > 4;
}

export function useMapViewport() {
  const [viewport, setViewport] = useState(initialViewport);
  const [mapSize, setMapSize] = useState<MapSize>();
  const viewportRef = useRef(initialViewport);
  const sizeRef = useRef<MapSize>({ width: 0, height: 0 });
  const viewRef = useRef<View>(null);
  const originRef = useRef(center);
  const gestureRef = useRef<{ touch: NonNullable<ReturnType<typeof readGesture>>; viewport: MapViewport } | null>(null);

  const updateViewport = useCallback((next: MapViewport) => {
    viewportRef.current = next;
    setViewport(next);
  }, []);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    const previousSize = sizeRef.current;
    if (previousSize.width !== width || previousSize.height !== height) {
      sizeRef.current = { width, height };
      setMapSize(fitMap(sizeRef.current));
      const current = viewportRef.current;
      updateViewport(previousSize.width === 0
        ? centerMap(ZOO_ENTRANCE_SVG.svgX, ZOO_ENTRANCE_SVG.svgY, current.scale, sizeRef.current)
        : transformMap(current, current.scale, center, center, sizeRef.current));
    }
    originRef.current = { x: width / 2, y: height / 2 };
    viewRef.current?.measure((_x, _y, measuredWidth, measuredHeight, pageX, pageY) => {
      originRef.current = { x: pageX + measuredWidth / 2, y: pageY + measuredHeight / 2 };
    });
  }, [updateViewport]);

  const zoomBy = useCallback((amount: number) => {
    const current = viewportRef.current;
    updateViewport(transformMap(current, current.scale + amount, center, center, sizeRef.current));
  }, [updateViewport]);

  const resetView = useCallback(() => updateViewport(initialViewport), [updateViewport]);

  const centerLocation = useCallback((svgX: number, svgY: number) => {
    updateViewport(centerMap(svgX, svgY, CENTER_LOCATION_ZOOM, sizeRef.current));
  }, [updateViewport]);

  const panResponder = useMemo(() => {
    function rebase(event: GestureResponderEvent) {
      const touch = readGesture(event, originRef.current);
      gestureRef.current = touch ? { touch, viewport: viewportRef.current } : null;
    }
    function clearGesture() {
      gestureRef.current = null;
    }
    return PanResponder.create({
      onStartShouldSetPanResponderCapture: (event) => event.nativeEvent.touches.length >= 2,
      onMoveShouldSetPanResponderCapture: shouldCapture,
      onPanResponderGrant: rebase,
      onPanResponderStart: rebase,
      onPanResponderEnd: rebase,
      onPanResponderRelease: clearGesture,
      onPanResponderTerminate: clearGesture,
      onPanResponderMove: (event) => {
        const touch = readGesture(event, originRef.current);
        const gesture = gestureRef.current;
        if (!touch) return;
        if (!gesture || gesture.touch.firstId !== touch.firstId || gesture.touch.secondId !== touch.secondId
          || (touch.distance > 0 && gesture.touch.distance === 0 && touch.secondId != null)) {
          rebase(event);
          return;
        }
        const ratio = gesture.touch.distance > 0 ? touch.distance / gesture.touch.distance : 1;
        updateViewport(transformMap(
          gesture.viewport,
          gesture.viewport.scale * ratio,
          gesture.touch.point,
          touch.point,
          sizeRef.current,
        ));
      },
    });
  }, [updateViewport]);

  return {
    viewport,
    mapSize,
    viewRef,
    handleLayout,
    panHandlers: panResponder.panHandlers,
    zoomIn: () => zoomBy(ZOOM_STEP),
    zoomOut: () => zoomBy(-ZOOM_STEP),
    resetView,
    centerLocation,
  };
}
