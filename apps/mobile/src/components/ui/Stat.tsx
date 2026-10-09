import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme/tokens';

interface StatProps {
  label: string;
  value?: string;
}

export function Stat({ label, value }: StatProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value || 'N/A'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    color: colors.textMuted,
  },
  value: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
});