import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';
import { Animal } from '../../models';
import { ImageOrPlaceholder } from './ImageOrPlaceholder';

interface AnimalListItemProps {
  animal: Animal;
  onPress: () => void;
}

export function AnimalListItem({ animal, onPress }: AnimalListItemProps) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View style={styles.row}>
        <View style={styles.imageContainer}>
          <ImageOrPlaceholder
            source={animal.imageUrl?.trim() ? { uri: animal.imageUrl.trim() } : null}
            tint={animal.placeholderTint}
            style={styles.image}
          />
        </View>
        <View style={styles.content}>
          <Text style={styles.name}>{animal.nickname}</Text>
          <Text style={styles.species}>{animal.commonName}</Text>
          <Text style={styles.zone}>{animal.zone}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
    marginVertical: spacing.xs,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    overflow: 'hidden',
    marginRight: spacing.md,
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 2,
  },
  species: {
    fontSize: 14,
    color: colors.textMuted,
  },
  zone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
});