import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, radius, spacing } from '../../theme/tokens';

interface WalkEstimateBadgeProps {
  destinationName: string;
  distanceMeters: number;
  estimatedMinutes: number;
}

/**
 * Insignia flotante accesible que muestra la distancia peatonal estimada en metros
 * y el tiempo aproximado a pie hacia el recinto destino activo (CA-19, CA-20).
 */
export function WalkEstimateBadge({
  destinationName,
  distanceMeters,
  estimatedMinutes,
}: WalkEstimateBadgeProps) {
  return (
    <View
      testID="walk-estimate-badge"
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Ruta peatonal hacia ${destinationName}: aproximadamente ${distanceMeters} metros, ${estimatedMinutes} min a pie`}
      style={styles.badge}
    >
      <AppText variant="caption" bold color="primary">
        {`Ruta a ${destinationName}`}
      </AppText>
      <AppText variant="caption" color="textMuted">
        {`~${distanceMeters} m • ${estimatedMinutes} min a pie`}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    left: spacing.sm,
    top: spacing.sm,
    maxWidth: '72%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    elevation: 3,
    gap: 2,
  },
});
