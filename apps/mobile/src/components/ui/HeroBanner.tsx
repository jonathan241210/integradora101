import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../../theme/tokens';

interface HeroBannerProps {
  overline: string;
  title: string;
  subtitle: string;
}

export function HeroBanner({ overline, title, subtitle }: HeroBannerProps) {
  return (
    <View style={styles.container}>
      {overline && <Text style={styles.overline}>{overline}</Text>}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
  },
  overline: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.background,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: colors.background,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.background,
    opacity: 0.9,
  },
});