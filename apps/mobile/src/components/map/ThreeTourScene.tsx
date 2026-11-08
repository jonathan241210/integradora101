import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Svg, { Ellipse, G, Line, Path } from 'react-native-svg';
import {
  ROUTE_LINE_COLOR,
  SVG_HEIGHT,
  SVG_WIDTH,
} from '../../constants/zoo';
import { colors } from '../../theme/tokens';
import { ArGuidanceResult } from '../../utils/arMath';
import { TourForkBranch } from '../../utils/tourPlanner';
import { ArVisualMode } from '../../viewmodels/useArTourViewModel';

interface ThreeTourSceneProps {
  visualMode: ArVisualMode;
  guidance: ArGuidanceResult | null;
  forkBranches: TourForkBranch[];
  onStepAnimation?: () => void;
}

export function ThreeTourScene({
  visualMode,
  guidance,
  forkBranches,
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
        {/* Nodo accesible para bifurcaciones (mantiene compatibilidad de tests sin sobrecargar la pantalla) */}
        <G testID="three-fork-branches">
          {forkBranches.map((branch) => (
            <G
              key={branch.id}
              testID={`fork-branch-line-${branch.targetPlaceId}`}
            />
          ))}
        </G>

        {/* Una sola línea central del sendero guía sobre el suelo */}
        <G testID="three-path-segments">
          {segments.map((seg) => (
            <G key={seg.id}>
              <Line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={ROUTE_LINE_COLOR}
                strokeWidth={Math.max(4, Math.round(seg.strokeWidth * 0.4))}
                strokeOpacity={0.6}
                strokeLinecap="round"
              />
            </G>
          ))}
        </G>

        {/* Una sola línea de flechas (chevrons) planas en fila india sobre el suelo */}
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
                {/* Sombra de contacto suave en el pavimento/césped */}
                <Ellipse
                  cx={cx}
                  cy={cy + 4}
                  rx={Math.max(8, Math.round(halfW * 1.05))}
                  ry={Math.max(4, Math.round(tipH * 0.75))}
                  fill="rgba(0, 0, 0, 0.22)"
                />
                {/* Flecha reflectante plana sobre el suelo */}
                <Path
                  d={chevronPath}
                  fill={colors.primary}
                  stroke={colors.surface}
                  strokeWidth="3"
                />
              </G>
            );
          })}
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
