import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { MapPlace } from '../../models';
import {
  SVG_WIDTH,
  SVG_HEIGHT,
  ROUTE_LINE_COLOR,
  ROUTE_LINE_DASH,
  ROUTE_LINE_WIDTH,
} from '../../constants/zoo';

interface DestinationRouteLineProps {
  userPosition: { svgX: number; svgY: number } | null;
  destinationPlace: MapPlace | null;
}

/**
 * Capa SVG superpuesta que traza una línea discontinua entre la posición
 * actual del visitante y las coordenadas del recinto destino seleccionado (CA-14).
 */
export function DestinationRouteLine({
  userPosition,
  destinationPlace,
}: DestinationRouteLineProps) {
  if (!userPosition || !destinationPlace) {
    return null;
  }

  const destSvgX = destinationPlace.mapX * SVG_WIDTH;
  const destSvgY = destinationPlace.mapY * SVG_HEIGHT;

  return (
    <Svg
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
      testID="destination-route-line"
    >
      <Line
        x1={userPosition.svgX}
        y1={userPosition.svgY}
        x2={destSvgX}
        y2={destSvgY}
        stroke={ROUTE_LINE_COLOR}
        strokeWidth={ROUTE_LINE_WIDTH}
        strokeDasharray={ROUTE_LINE_DASH}
        strokeLinecap="round"
      />
    </Svg>
  );
}
