import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface CardProps {
  style?: any;
  children: React.ReactNode;
}

export function Card({ style, children }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    elevation: 1,
  },
});