import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { ZooEvent } from '../../models';

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
      <View style={styles.content}>
        <Text style={styles.title}>{event.title}</Text>
        <Text style={styles.details}>
          {event.time} • {event.location}
        </Text>
      </View>
    </TouchableOpacity>
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
  content: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  details: {
    fontSize: 12,
    color: colors.textMuted,
  },
});