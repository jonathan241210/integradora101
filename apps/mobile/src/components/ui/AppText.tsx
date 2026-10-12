import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../../theme';

export type TextVariant = 'title' | 'subheading' | 'body' | 'small' | 'caption' | 'overline' | 'heading';

interface AppTextProps {
  variant?: TextVariant;
  children: React.ReactNode;
  color?: 'text' | 'textMuted' | 'textOnPrimary' | 'primary' | 'accent' | 'danger';
  bold?: boolean;
  center?: boolean;
  style?: any;
}

const variantStyles: Record<TextVariant, any> = {
  heading: { fontSize: 24, fontWeight: 'bold', lineHeight: 32 },
  title: { fontSize: 20, fontWeight: 'bold', lineHeight: 28 },
  subheading: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '400', lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '400', lineHeight: 16 },
  overline: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
};

const colorMap: Record<string, string> = {
  text: theme.colors.text,
  textMuted: theme.colors.textMuted,
  textOnPrimary: theme.colors.textOnPrimary,
  primary: theme.colors.primary,
  accent: theme.colors.accent,
  danger: theme.colors.danger,
};

export function AppText({ variant = 'body', children, color = 'text', bold, center, style }: AppTextProps) {
  return (
    <Text style={[
      variantStyles[variant],
      { color: colorMap[color] },
      bold && { fontWeight: 'bold' },
      center && { textAlign: 'center' },
      style
    ]}>
      {children}
    </Text>
  );
}
