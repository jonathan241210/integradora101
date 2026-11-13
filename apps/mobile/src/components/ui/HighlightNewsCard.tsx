import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { News } from '../../models';
import { Icon } from './Icon';
import { ImageOrPlaceholder } from './ImageOrPlaceholder';

interface HighlightNewsCardProps {
  news: News;
  onPress?: () => void;
}

export function HighlightNewsCard({ news, onPress }: HighlightNewsCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `Ver noticia ${news.title}` : news.title}
    >
      <ImageOrPlaceholder
        source={news.imageUrl?.trim() ? { uri: news.imageUrl.trim() } : null}
        tint={colors.primary}
        style={styles.image}
      />
      {news.date ? <Text style={styles.date}>{news.date}</Text> : null}
      <View style={styles.titleRow}>
        <Text style={styles.title}>{news.title}</Text>
        {onPress ? <Icon name="chevron-forward" size={18} color={colors.secondary} /> : null}
      </View>
      {news.body ? <Text style={styles.body}>{news.body}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    elevation: 1,
  },
  image: {
    width: '100%',
    height: 140,
    marginBottom: spacing.sm,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 8 },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 14,
    color: colors.text,
  },
});
