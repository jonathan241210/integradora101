import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AVATAR_CODES, AVATAR_LABELS, AvatarCode } from '../constants/avatarCatalog';
import { colors, spacing } from '../theme/tokens';
import { AppText } from './ui';

interface AvatarPickerProps {
  value: AvatarCode | null;
  onChange: (code: AvatarCode) => void;
}

export function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  return (
    <View style={styles.grid}>
      {AVATAR_CODES.map((code) => {
        const selected = value === code;
        return (
          <Pressable
            key={code}
            accessibilityRole="button"
            accessibilityLabel={`Avatar ${AVATAR_LABELS[code]}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(code)}
            style={styles.choice}
          >
            <View style={[styles.circle, selected ? styles.selected : null]}>
              <AppText variant="small" center bold={selected}>{AVATAR_LABELS[code]}</AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  choice: { width: 96, alignItems: 'center' },
  circle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  selected: { borderColor: colors.secondary, backgroundColor: colors.accent, borderWidth: 3 },
});
