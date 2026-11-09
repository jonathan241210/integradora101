import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polyline,
  Rect,
  Text as SvgText,
} from 'react-native-svg';
import {
  ROUTE_LINE_COLOR,
  SVG_HEIGHT,
  SVG_WIDTH,
} from '../../constants/zoo';
import { colors } from '../../theme/tokens';
import { ArGuidanceResult } from '../../utils/arMath';
import { TourForkBranch } from '../../utils/tourPlanner';
import { ArVisualMode } from '../../viewmodels/useArTourViewModel';
import { MapPlace } from '../../models';
import { getAnimalCardData } from '../../utils/enclosureAnimals';

interface ThreeTourSceneProps {
  visualMode: ArVisualMode;
  guidance: ArGuidanceResult | null;
  forkBranches: TourForkBranch[];
  currentStop?: MapPlace | null;
  isArrived?: boolean;
  onStepAnimation?: () => void;
}

export function ThreeTourScene({
  visualMode,
  guidance,
  forkBranches,
  currentStop,
  isArrived = false,
  onStepAnimation,
}: ThreeTourSceneProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const isCameraGranted = Boolean(permission?.granted);

  useEffect(() => {
    if (visualMode === 'camera-ar' && !isCameraGranted && permission?.canAskAgain !== false) {
      void requestPermission?.().catch(() => undefined);
    }
  }, [visualMode, isCameraGranted, permission?.canAskAgain, requestPermission]);

  useEffect(() => {
    if (!onStepAnimation) {
      return undefined;
    }
    const timer = setInterval(() => {
      onStepAnimation();
    }, 450);

    return () => {
      clearInterval(timer);
    };
  }, [onStepAnimation]);

  const segments = guidance?.projectedSegments ?? [];
  const chevrons = guidance?.projectedChevrons ?? [];
  const showLiveCamera = visualMode === 'camera-ar' && isCameraGranted;

  const animalData = currentStop ? getAnimalCardData(currentStop) : null;

  // Punto objetivo del recinto en la escena AR
  const beaconPoint = useMemo(() => {
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      return { x: lastSeg.x2, y: lastSeg.y2 };
    }
    return { x: 500, y: 380 };
  }, [segments]);

  // Cadena de coordenadas para la línea de conexión directa hacia el recinto
  const routePointsString = useMemo(() => {
    if (segments.length === 0) {
      return `500,1380 ${beaconPoint.x},${beaconPoint.y}`;
    }
    const pts = ['500,1380'];
    segments.forEach((seg) => {
      pts.push(`${seg.x1},${seg.y1}`);
      pts.push(`${seg.x2},${seg.y2}`);
    });
    return pts.join(' ');
  }, [segments, beaconPoint]);

  const beaconColor = isArrived ? '#2E7D32' : ROUTE_LINE_COLOR;

  return (
    <View
      testID="three-tour-scene"
      style={[
        styles.container,
        showLiveCamera ? styles.cameraBackdrop : styles.sceneBackdrop,
      ]}
    >
      {showLiveCamera ? (
        <CameraView
          testID="ar-camera-feed-layer"
          facing="back"
          accessible
          accessibilityLabel="Vista de cámara AR en vivo con sendero 3D superpuesto"
          onMountError={(err) => {
            console.warn('CameraView mount warning:', err);
          }}
          style={styles.fillLayer}
        />
      ) : (
        <View
          testID="ar-virtual-3d-floor"
          accessible
          accessibilityLabel="Escena 3D virtual del sendero sin cámara"
          style={styles.fillLayer}
        />
      )}

      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        preserveAspectRatio="xMidYMid slice"
        pointerEvents="none"
        style={styles.fillLayer}
      >
        {/* Nodo accesible para bifurcaciones */}
        <G testID="three-fork-branches">
          {forkBranches.map((branch) => (
            <G
              key={branch.id}
              testID={`fork-branch-line-${branch.targetPlaceId}`}
            />
          ))}
        </G>

        {/* 1. Línea continua y visible de unión entre el usuario y el punto del recinto en AR */}
        <G testID="ar-destination-route-line">
          {/* Halo de resplandor para visibilidad con luz exterior */}
          <Polyline
            points={routePointsString}
            fill="none"
            stroke="rgba(33, 150, 243, 0.35)"
            strokeWidth={20}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Línea principal vibrante discontinua hacia el recinto */}
          <Polyline
            points={routePointsString}
            fill="none"
            stroke={beaconColor}
            strokeWidth={7}
            strokeDasharray="14, 8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>

        {/* 2. Segmentos del sendero guía sobre el suelo */}
        <G testID="three-path-segments">
          {segments.map((seg) => (
            <G key={seg.id}>
              <Line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={beaconColor}
                strokeWidth={Math.max(4, Math.round(seg.strokeWidth * 0.4))}
                strokeOpacity={0.6}
                strokeLinecap="round"
              />
            </G>
          ))}
        </G>

        {/* 3. Corriente de flechas (chevrons) planas sobre el suelo */}
        <G testID="three-chevron-stream">
          {chevrons.map((chevron) => {
            const halfW = Math.round(62 * chevron.scale);
            const tipH = Math.round(26 * chevron.scale);
            const tailH = Math.round(13 * chevron.scale);
            const cx = chevron.screenX;
            const cy = chevron.screenY;

            const chevronPath = `M ${cx} ${cy - tipH} L ${cx + halfW} ${cy + tailH} L ${cx} ${cy - Math.round(tipH * 0.15)} L ${cx - halfW} ${cy + tailH} Z`;

            return (
              <G key={chevron.id}>
                <Ellipse
                  cx={cx}
                  cy={cy + 4}
                  rx={Math.max(8, Math.round(halfW * 1.05))}
                  ry={Math.max(4, Math.round(tipH * 0.75))}
                  fill="rgba(0, 0, 0, 0.22)"
                />
                <Path
                  d={chevronPath}
                  fill={isArrived ? '#2E7D32' : colors.primary}
                  stroke={colors.surface}
                  strokeWidth="3"
                />
              </G>
            );
          })}
        </G>

        {/* 4. Punto flotante / Baliza indicadora del recinto en modo AR */}
        <G testID="ar-destination-enclosure-beacon">
          {/* Anillo exterior pulsante sobre el suelo */}
          <Circle
            testID="ar-beacon-outer-pulse"
            cx={beaconPoint.x}
            cy={beaconPoint.y}
            r={32}
            fill={isArrived ? 'rgba(46, 125, 50, 0.28)' : 'rgba(33, 150, 243, 0.28)'}
            stroke={beaconColor}
            strokeWidth={3}
          />
          {/* Punto central del recinto */}
          <Circle
            testID="ar-beacon-center-dot"
            cx={beaconPoint.x}
            cy={beaconPoint.y}
            r={14}
            fill={beaconColor}
            stroke="#FFFFFF"
            strokeWidth={3}
          />
          <Circle
            cx={beaconPoint.x}
            cy={beaconPoint.y}
            r={5}
            fill="#FFFFFF"
          />

          {/* Vástago o poste vertical hacia el cartel flotante del recinto */}
          <Line
            x1={beaconPoint.x}
            y1={beaconPoint.y}
            x2={beaconPoint.x}
            y2={beaconPoint.y - 48}
            stroke={beaconColor}
            strokeWidth={3}
            strokeDasharray="4, 4"
          />

          {/* Pin flotante con icono */}
          <Circle
            cx={beaconPoint.x}
            cy={beaconPoint.y - 48}
            r={20}
            fill="#FFFFFF"
            stroke={beaconColor}
            strokeWidth={3}
          />
          <SvgText
            x={beaconPoint.x}
            y={beaconPoint.y - 41}
            textAnchor="middle"
            fontSize="18"
          >
            {isArrived ? '🎯' : (animalData?.iconEmoji ?? '📍')}
          </SvgText>

          {/* Etiqueta flotante con el nombre del recinto */}
          <Rect
            x={beaconPoint.x - 90}
            y={beaconPoint.y - 92}
            width={180}
            height={32}
            rx={16}
            fill="rgba(15, 23, 42, 0.90)"
            stroke={beaconColor}
            strokeWidth={2}
          />
          <SvgText
            x={beaconPoint.x}
            y={beaconPoint.y - 71}
            textAnchor="middle"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="bold"
          >
            {isArrived ? '🎉 ¡HAS LLEGADO!' : (currentStop?.name ?? 'Recinto')}
          </SvgText>
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  fillLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cameraBackdrop: {
    backgroundColor: 'transparent',
  },
  sceneBackdrop: {
    backgroundColor: colors.background,
  },
});
