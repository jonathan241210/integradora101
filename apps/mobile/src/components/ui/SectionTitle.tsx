import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from './Icon';
import { AppText } from './AppText';
import { colors, spacing } from '../../theme/tokens';

interface SectionTitleProps {
  icon: string;
  text: string;
}

export function SectionTitle({ icon, text }: SectionTitleProps) {
  return (
    <View style={styles.container}>
      <Icon name={icon} size={16} color={colors.primary} />
      <AppText variant="subheading" bold>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});