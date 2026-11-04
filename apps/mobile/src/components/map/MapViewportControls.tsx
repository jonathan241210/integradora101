import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { MAX_ZOOM_SCALE, MIN_ZOOM_SCALE } from '../../constants/zoo';
import { colors, radius, spacing } from '../../theme/tokens';

interface MapViewportControlsProps {
  zoomScale: number;
  canCenterLocation: boolean;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onCenterLocation: () => void;
}

/**
 * Controles flotantes accesibles para acercar, alejar, restablecer vista
 * y centrar el mapa en la ubicación del visitante (CA-15, CA-17, RN-16).
 */
export function MapViewportControls({
  zoomScale,
  canCenterLocation,
  onZoomIn,
  onZoomOut,
  onResetView,
  onCenterLocation,
}: MapViewportControlsProps) {
  const canZoomIn = zoomScale < MAX_ZOOM_SCALE;
  const canZoomOut = zoomScale > MIN_ZOOM_SCALE;

  return (
    <View style={styles.container} testID="map-viewport-controls">
      <Pressable
        testID="map-zoom-in"
        accessibilityRole="button"
        accessibilityLabel="Acercar mapa"
        accessibilityState={{ disabled: !canZoomIn }}
        disabled={!canZoomIn}
        onPress={onZoomIn}
        style={[styles.controlButton, !canZoomIn && styles.controlButtonDisabled]}
      >
        <AppText variant="subheading" bold color={canZoomIn ? 'primary' : 'textMuted'}>
          +
        </AppText>
      </Pressable>

      <Pressable
        testID="map-zoom-out"
        accessibilityRole="button"
        accessibilityLabel="Alejar mapa"
        accessibilityState={{ disabled: !canZoomOut }}
        disabled={!canZoomOut}
        onPress={onZoomOut}
        style={[styles.controlButton, !canZoomOut && styles.controlButtonDisabled]}
      >
        <AppText variant="subheading" bold color={canZoomOut ? 'primary' : 'textMuted'}>
          −
        </AppText>
      </Pressable>

      <Pressable
        testID="map-zoom-reset"
        accessibilityRole="button"
        accessibilityLabel="Restablecer vista del mapa"
        onPress={onResetView}
        style={styles.controlButton}
      >
        <AppText variant="caption" bold color="text">
          {`${zoomScale}x`}
        </AppText>
      </Pressable>

      {canCenterLocation && (
        <Pressable
          testID="map-center-location"
          accessibilityRole="button"
          accessibilityLabel="Centrar en mi ubicación"
          onPress={onCenterLocation}
          style={[styles.controlButton, styles.centerButton]}
        >
          <AppText variant="caption" bold color="textOnPrimary">
            Ubicación
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    gap: spacing.xs,
    zIndex: 5,
    alignItems: 'flex-end',
  },
  controlButton: {
    minWidth: 40,
    minHeight: 40,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  controlButtonDisabled: {
    opacity: 0.5,
  },
  centerButton: {
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
