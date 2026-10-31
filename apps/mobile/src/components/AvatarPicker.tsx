import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AVATAR_CODES, AVATAR_LABELS, AvatarCode } from '../constants/avatarCatalog';
import { colors, radius, spacing } from '../theme/tokens';
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
            style={[styles.item, selected ? styles.selected : null]}
          >
            <AppText variant="small" center>{AVATAR_LABELS[code]}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: {
    minWidth: 88,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
});
