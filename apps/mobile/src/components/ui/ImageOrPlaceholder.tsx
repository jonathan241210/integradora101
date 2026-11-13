import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Image, ImageSourcePropType, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, radius } from '../../theme/tokens';

interface ImageOrPlaceholderProps {
  source: ImageSourcePropType | null;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  blurRadius?: number;
}

function sourceIdentity(source: ImageSourcePropType | null): string | number | null {
  if (!source || Array.isArray(source)) return null;
  if (typeof source === 'number') return source;
  return typeof source.uri === 'string' && source.uri.trim() ? source.uri.trim() : null;
}

export function ImageOrPlaceholder({ source, tint = colors.primary, style, blurRadius = 0 }: ImageOrPlaceholderProps) {
  const identity = sourceIdentity(source);
  const stableSource = useMemo(() => {
    if (typeof identity === 'string') return { uri: identity };
    if (typeof identity === 'number') return identity;
    return null;
  }, [identity]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [identity]);

  return (
    <View style={[styles.container, style]}>
      {stableSource && !failed ? (
        <Image
          source={stableSource}
          style={styles.image}
          resizeMode="cover"
          blurRadius={blurRadius}
          fadeDuration={0}
          onError={() => setFailed(true)}
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
    color: colors.textOnPrimary,
    backgroundColor: colors.text,
    fontWeight: '600' as const,
    fontSize: 14,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
