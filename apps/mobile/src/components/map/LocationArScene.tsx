import React, { memo, useEffect, useMemo, useState } from 'react';
import { Dimensions, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppText } from '../ui';
import { colors, radius, spacing } from '../../theme/tokens';
import { ArLocationPoint, AR_FOV_DEGREES } from '../../utils/arLocationMath';

interface LocationArSceneProps {
  points: ArLocationPoint[];
  hasLocation: boolean;
  headingAvailable: boolean;
  lowAccuracy: boolean;
}

const CameraLayer = memo(function CameraLayer() {
  const [permission, requestPermission] = useCameraPermissions();
  const isCameraGranted = Boolean(permission?.granted);

  useEffect(() => {
    if (!isCameraGranted && permission?.canAskAgain !== false) {
      void requestPermission?.().catch(() => undefined);
    }
  }, [isCameraGranted, permission?.canAskAgain, requestPermission]);

  if (isCameraGranted) {
    return (
      <CameraView
        testID="ar-camera-feed-layer"
        facing="back"
        style={StyleSheet.absoluteFill}
        accessible
        accessibilityLabel="Vista de cámara AR con puntos de recintos cercanos"
      />
    );
  }

  return (
    <View
      testID="ar-camera-permission-fallback"
      style={[StyleSheet.absoluteFill, styles.permissionFallback]}
    >
      <AppText variant="body" color="textOnPrimary" style={styles.centerText}>
        Se necesita permiso de cámara para mostrar el modo AR.
      </AppText>
    </View>
  );
});

function LocationArSceneBase({
  points,
  hasLocation,
  headingAvailable,
  lowAccuracy,
}: LocationArSceneProps) {
  const windowSize = Dimensions.get('window');
  const [size, setSize] = useState({ width: windowSize.width, height: windowSize.height });

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0 && (width !== size.width || height !== size.height)) {
      setSize({ width, height });
    }
  };

  const positionedPoints = useMemo(() => {
    if (size.width === 0 || size.height === 0) return [];
    const halfFov = AR_FOV_DEGREES / 2;
    const horizonY = size.height * 0.45;

    return points.map((point) => {
      const clampedRel = Math.max(-halfFov, Math.min(halfFov, point.relativeBearingDegrees));
      const x = ((clampedRel / halfFov) * 0.5 + 0.5) * size.width;
      const distanceFactor = Math.min(1, Math.max(0, (point.distanceMeters - 5) / 75));
      const y = horizonY - (1 - distanceFactor) * 70;
      return { ...point, x, y };
    });
  }, [points, size.height, size.width]);

  return (
    <View style={styles.container} onLayout={onLayout} testID="location-ar-scene">
      <CameraLayer />

      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {positionedPoints.map((point) => {
          const isZooPlace = point.kind === 'zoo_place';
          const pointColor = isZooPlace ? colors.primary : colors.info;
          return (
            <View
              key={point.id}
              testID={`ar-point-${point.id}`}
              style={[styles.pointWrap, { left: point.x - 40, top: point.y - 28 }]}
            >
              <View style={[styles.dotOuter, { borderColor: pointColor }]}>
                <View style={[styles.dotInner, { backgroundColor: pointColor }]} />
              </View>
              {point.showLabel && (
                <View style={styles.label}>
                  <AppText variant="caption" bold color="text" numberOfLines={1}>
                    {point.name}
                  </AppText>
                  <AppText variant="caption" color="textMuted">
                    {`${Math.round(point.distanceMeters)} m`}
                  </AppText>
                </View>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.statusTop} pointerEvents="none">
        {(!hasLocation || !headingAvailable || lowAccuracy) && (
          <View style={styles.statusBadge} testID="ar-calibration-hint">
            <AppText variant="caption" color="textOnPrimary">
              {!hasLocation
                ? 'Activa la ubicación para ver recintos cercanos.'
                : !headingAvailable
                  ? 'Brújula no disponible. Mueve el teléfono para calibrar.'
                  : 'Precisión baja. Mueve el teléfono en forma de 8 para calibrar.'}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

export const LocationArScene = memo(LocationArSceneBase);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.text,
  },
  permissionFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.text,
  },
  centerText: {
    textAlign: 'center',
  },
  pointWrap: {
    position: 'absolute',
    width: 80,
    alignItems: 'center',
  },
  dotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.info,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.info,
  },
  label: {
    marginTop: 4,
    maxWidth: 120,
    backgroundColor: colors.surfaceOverlay,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  statusTop: {
    position: 'absolute',
    top: 132,
    left: spacing.md,
    right: spacing.md,
  },
  statusBadge: {
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
});