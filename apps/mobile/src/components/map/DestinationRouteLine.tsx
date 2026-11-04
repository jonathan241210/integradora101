import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { MapPlace } from '../../models';
import {
  SVG_WIDTH,
  SVG_HEIGHT,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_DASH,
  ROUTE_LINE_WIDTH,
} from '../../constants/zoo';
import { computeWalkRoute } from '../../utils/pathfinding';

interface DestinationRouteLineProps {
  userPosition: { svgX: number; svgY: number } | null;
  destinationPlace: MapPlace | null;
}

/**
 * Capa SVG superpuesta que traza una polilínea discontinua siguiendo la red
 * de andadores peatonales entre la posición actual del visitante y el recinto
 * destino seleccionado (CA-14, CA-18, CA-20).
 */
export function DestinationRouteLine({
  userPosition,
  destinationPlace,
}: DestinationRouteLineProps) {
  const walkRoute = useMemo(() => {
    if (!userPosition || !destinationPlace) {
      return null;
    }
    const destSvgX = destinationPlace.mapX * SVG_WIDTH;
    const destSvgY = destinationPlace.mapY * SVG_HEIGHT;
    return computeWalkRoute(
      { svgX: userPosition.svgX, svgY: userPosition.svgY },
      { svgX: destSvgX, svgY: destSvgY },
    );
  }, [userPosition, destinationPlace]);

  if (!walkRoute) {
    return null;
  }

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      testID="destination-route-line"
      accessibilityLabel={walkRoute.svgPointsString}
    >
      <Polyline
        testID="destination-route-polyline"
        points={walkRoute.svgPointsString}
        fill="none"
        stroke={ROUTE_LINE_COLOR}
        strokeWidth={ROUTE_LINE_WIDTH}
        strokeDasharray={ROUTE_LINE_DASH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
