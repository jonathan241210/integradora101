import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { Animal } from '../../models';
import { ImageOrPlaceholder } from './ImageOrPlaceholder';

interface AnimalHighlightCardProps {
  animal: Animal;
  onPress: () => void;
}

export function AnimalHighlightCard({ animal, onPress }: AnimalHighlightCardProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.imageContainer}>
        <ImageOrPlaceholder
          source={animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null}
          tint={animal.placeholderTint}
          style={styles.image}
        />
        <View style={styles.overlay}>
          <Text style={styles.animalName}>{animal.nickname}</Text>
        </View>
      </View>
      <View style={styles.content}>
        <Text style={styles.commonName}>{animal.commonName}</Text>
        <Text style={styles.scientificName}>{animal.scientificName}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.background,
    elevation: 2,
  },
  imageContainer: {
    position: 'relative',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.text,
    padding: spacing.sm,
  },
  animalName: {
    color: colors.background,
    fontWeight: '600' as const,
  },
  content: {
    padding: spacing.md,
  },
  commonName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  scientificName: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
});