import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import Svg, { Ellipse, G, Line, Path, Rect } from 'react-native-svg';
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
  const [cameraGranted, setCameraGranted] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    if (visualMode === 'camera-ar' && Camera?.requestCameraPermissionsAsync) {
      void Camera.requestCameraPermissionsAsync()
        .then((res) => {
          if (active) {
            setCameraGranted(Boolean(res?.granted ?? res?.status === 'granted'));
          }
        })
        .catch(() => {
          if (active) {
            setCameraGranted(false);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [visualMode]);

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
  const showLiveCamera = visualMode === 'camera-ar' && cameraGranted;

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
        {!showLiveCamera && (
          <Rect
            x="0"
            y="520"
            width={SVG_WIDTH}
            height="880"
            fill={colors.primarySoft}
            fillOpacity={0.6}
          />
        )}

        <Line
          x1="460"
          y1="540"
          x2="90"
          y2="1320"
          stroke={colors.surface}
          strokeOpacity={0.45}
          strokeWidth="3"
          strokeDasharray="12 12"
        />
        <Line
          x1="540"
          y1="540"
          x2="910"
          y2="1320"
          stroke={colors.surface}
          strokeOpacity={0.45}
          strokeWidth="3"
          strokeDasharray="12 12"
        />

        <G testID="three-fork-branches">
          {forkBranches.map((branch) => (
            <G
              key={branch.id}
              testID={`fork-branch-line-${branch.targetPlaceId}`}
            >
              <Line
                x1={branch.line3D.x1}
                y1={branch.line3D.y1}
                x2={branch.line3D.x2}
                y2={branch.line3D.y2}
                stroke={branch.isPrimary ? ROUTE_LINE_COLOR : colors.accent}
                strokeWidth={branch.isPrimary ? 18 : 12}
                strokeDasharray={branch.isPrimary ? undefined : '16 10'}
                strokeLinecap="round"
              />
              <Ellipse
                cx={branch.line3D.x2}
                cy={branch.line3D.y2}
                rx={branch.isPrimary ? 22 : 16}
                ry={branch.isPrimary ? 22 : 16}
                fill={branch.isPrimary ? colors.primary : colors.accent}
                stroke={colors.surface}
                strokeWidth="4"
              />
            </G>
          ))}
        </G>

        <G testID="three-path-segments">
          {segments.map((seg) => (
            <G key={seg.id}>
              <Line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={colors.surface}
                strokeWidth={seg.strokeWidth + 10}
                strokeLinecap="round"
              />
              <Line
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={ROUTE_LINE_COLOR}
                strokeWidth={seg.strokeWidth + 2}
                strokeLinecap="round"
              />
            </G>
          ))}
        </G>

        <G testID="three-chevron-stream">
          {chevrons.map((chevron) => {
            const halfW = Math.round(52 * chevron.scale);
            const tipH = Math.round(58 * chevron.scale);
            const tailH = Math.round(22 * chevron.scale);
            const cx = chevron.screenX;
            const cy = chevron.screenY;

            const d = `M ${cx} ${cy - tipH} L ${cx + halfW} ${cy + tailH} L ${cx} ${cy - Math.round(tipH * 0.25)} L ${cx - halfW} ${cy + tailH} Z`;

            return (
              <Path
                key={chevron.id}
                d={d}
                fill={colors.primary}
                stroke={colors.surface}
                strokeWidth="4"
              />
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
    backgroundColor: colors.text,
  },
  sceneBackdrop: {
    backgroundColor: colors.background,
  },
});
