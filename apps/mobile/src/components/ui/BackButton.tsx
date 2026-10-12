import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme/tokens';
import { Icon } from './Icon';

interface BackButtonProps {
  onPress: () => void;
  accessibilityLabel?: string;
}

export function BackButton({ onPress, accessibilityLabel = 'Volver' }: BackButtonProps) {
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Icon name="arrow-back" size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
