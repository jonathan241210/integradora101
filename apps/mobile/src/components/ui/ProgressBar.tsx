import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';
import { AppText } from './AppText';

interface ProgressBarProps {
  value: number;
  label: string;
  labelColor?: 'text' | 'textMuted' | 'textOnPrimary' | 'primary' | 'accent' | 'danger';
}

export function ProgressBar({ value, label, labelColor = 'text' }: ProgressBarProps) {
  const progress = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
      testID="progress-bar"
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <AppText variant="caption" color={labelColor}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: spacing.xs,
    overflow: 'hidden',
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
