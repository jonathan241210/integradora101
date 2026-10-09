import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface LocationPillProps {
  label: string;
  variant?: 'filled' | 'outline';
}

export function LocationPill({ label, variant = 'filled' }: LocationPillProps) {
  return (
    <View style={[styles.container, styles[variant]]}>
      <Text style={[styles.text, { color: variant === 'filled' ? colors.background : colors.primary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  filled: {
    backgroundColor: colors.primary,
  },
  outline: {
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
});