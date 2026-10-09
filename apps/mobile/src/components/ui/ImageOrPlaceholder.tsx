import React from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface ImageOrPlaceholderProps {
  source: ImageSourcePropType | null;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  blurRadius?: number;
}

export function ImageOrPlaceholder({ source, tint = colors.primary, style, blurRadius = 0 }: ImageOrPlaceholderProps) {
  return (
    <View style={[styles.container, style]}>
      {source ? (
        <Image 
          source={source} 
          style={styles.image} 
          resizeMode="cover"
          blurRadius={blurRadius}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: tint }]}>
          <Text style={styles.placeholderText}>IMAGEN</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.background,
    fontWeight: '600' as const,
    fontSize: 14,
  },
});