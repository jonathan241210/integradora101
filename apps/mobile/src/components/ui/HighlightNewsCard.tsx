import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { News } from '../../models';

interface HighlightNewsCardProps {
  news: News;
}

export function HighlightNewsCard({ news }: HighlightNewsCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{news.title}</Text>
      <Text style={styles.body}>{news.body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: colors.text,
    marginBottom: 12,
  },
});