import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { MapPlace } from '../../models';
import {
  SVG_WIDTH,
  SVG_HEIGHT,
  ROUTE_LINE_DASH,
  ROUTE_LINE_WIDTH,
} from '../../constants/zoo';
import { computeWalkRoute } from '../../utils/pathfinding';
import { colors } from '../../theme/tokens';

interface DestinationRouteLineProps {
  userPosition: { svgX: number; svgY: number } | null;
  destinationPlace: MapPlace | null;
}

/**
 * Capa SVG superpuesta que traza una polilínea discontinua siguiendo la red
 * de andadores peatonales entre la posición actual del visitante y el recinto
 * destino seleccionado (CA-14, CA-18, CA-20), junto con un punto flotante
 * indicador en el extremo del destino.
 */
export function DestinationRouteLine({
  userPosition,
  destinationPlace,
}: DestinationRouteLineProps) {
  const destSvgX = destinationPlace ? destinationPlace.mapX * SVG_WIDTH : 0;
  const destSvgY = destinationPlace ? destinationPlace.mapY * SVG_HEIGHT : 0;

  const walkRoute = useMemo(() => {
    if (!userPosition || !destinationPlace) {
      return null;
    }
    return computeWalkRoute(
      { svgX: userPosition.svgX, svgY: userPosition.svgY },
      { svgX: destSvgX, svgY: destSvgY },
    );
  }, [userPosition, destinationPlace, destSvgX, destSvgY]);

  if (!walkRoute || !destinationPlace) {
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
        stroke={colors.info}
        strokeWidth={ROUTE_LINE_WIDTH}
        strokeDasharray={ROUTE_LINE_DASH}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Halo / Anillo flotante del punto destino */}
      <Circle
        testID="destination-route-target-pulse"
        cx={destSvgX}
        cy={destSvgY}
        r={16}
        fill={colors.info}
        fillOpacity={0.22}
        stroke={colors.info}
        strokeWidth={2}
      />
      {/* Punto central del destino conectado */}
      <Circle
        testID="destination-route-target-dot"
        cx={destSvgX}
        cy={destSvgY}
        r={7}
        fill={colors.info}
      />
      <Circle
        cx={destSvgX}
        cy={destSvgY}
        r={3}
        fill={colors.surface}
      />
    </Svg>
  );
}
