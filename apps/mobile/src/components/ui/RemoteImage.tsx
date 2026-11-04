import React, { useState } from 'react';
import { View, Image, StyleSheet, ActivityIndicator, StyleProp, ViewStyle, ImageStyle, Text } from 'react-native';
import { colors, radius } from '../../theme/tokens';

export interface RemoteImageProps {
  uri?: string | null;
  placeholderTint?: string;
  altText?: string;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  fallbackLabel?: string;
}

export function RemoteImage({
  uri,
  placeholderTint,
  altText = 'Fotografía',
  style,
  imageStyle,
  fallbackLabel = 'ARCA-NB',
}: RemoteImageProps) {
  const [loading, setLoading] = useState<boolean>(Boolean(uri));
  const [hasError, setHasError] = useState<boolean>(!uri);

  const showPlaceholder = !uri || hasError;
  const tintColor = placeholderTint || colors.secondary;

  return (
    <View style={[styles.container, style]} accessibilityLabel={altText} accessibilityRole="image">
      {showPlaceholder ? (
        <View style={[styles.placeholder, { backgroundColor: tintColor }]}>
          <Text style={styles.placeholderLabel}>{fallbackLabel}</Text>
        </View>
      ) : (
        <>
          <Image
            source={{ uri }}
            style={[styles.image, imageStyle]}
            resizeMode="cover"
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setHasError(true);
            }}
          />
          {loading && (
            <View style={[styles.loadingOverlay, { backgroundColor: tintColor }]}>
              <ActivityIndicator color={colors.textOnPrimary} size="small" />
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: radius.md,
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
  placeholderLabel: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    opacity: 0.85,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
});
