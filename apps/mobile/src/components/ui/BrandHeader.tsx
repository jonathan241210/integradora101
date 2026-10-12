import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Icon } from './Icon';
import { colors, spacing } from '../../theme/tokens';

interface BrandHeaderProps {
  appName: string;
  onBellPress?: () => void;
}

export function BrandHeader({ appName, onBellPress }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.appName}>{appName}</Text>
      {onBellPress ? (
        <TouchableOpacity onPress={onBellPress} style={styles.bellButton}>
          <Icon name="bell" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  bellButton: {
    padding: spacing.xs,
  },
});