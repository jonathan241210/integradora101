import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface OfflineBannerProps {
  message?: string;
}

export function OfflineBanner({ message = 'Modo sin conexión. Mostrando información guardada.' }: OfflineBannerProps) {
  return (
    <View style={styles.container} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <View style={styles.badge}>
        <Text style={styles.badgeText}>SIN CONEXIÓN</Text>
      </View>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.accent,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    marginRight: spacing.xs,
  },
  badgeText: {
    color: colors.textOnPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  text: {
    color: colors.text,
    fontSize: 12,
    flex: 1,
  },
});
