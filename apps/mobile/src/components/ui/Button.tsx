import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { theme } from '../../theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'outline' | 'soft';
  style?: any;
}

export function Button({ label, onPress, variant = 'primary', style }: ButtonProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'danger': return { backgroundColor: theme.colors.danger, color: theme.colors.textOnPrimary };
      case 'outline': return { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.colors.primary, color: theme.colors.primary };
      case 'soft': return { backgroundColor: theme.colors.primarySoft, color: theme.colors.primary };
      default: return { backgroundColor: theme.colors.primary, color: theme.colors.textOnPrimary };
    }
  };

  const variantStyle = getVariantStyle();

  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.button, variantStyle, style]}
      accessibilityRole="button"
    >
      <Text style={[styles.text, { color: variantStyle.color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
});
