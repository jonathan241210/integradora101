import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { ZooEvent } from '../../models';
import { Icon } from './Icon';
import { ImageOrPlaceholder } from './ImageOrPlaceholder';

interface EventCardProps {
  event: ZooEvent;
  onPress: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalles de ${event.title}`}
    >
      <ImageOrPlaceholder
        source={event.imageUrls?.[0]?.trim() ? { uri: event.imageUrls[0].trim() } : null}
        tint={colors.primary}
        style={styles.image}
      />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{event.title}</Text>
          <Icon name="chevron-forward" size={18} color={colors.secondary} />
        </View>
        <Text style={styles.details}>
          {event.time} • {event.location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginVertical: spacing.xs,
    elevation: 1,
  },
  image: {
    width: '100%',
    height: 120,
    marginBottom: spacing.sm,
  },
  content: {
    gap: spacing.xs,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
  },
  details: {
    fontSize: 12,
    color: colors.textMuted,
  },
});