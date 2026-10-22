import React, { ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { colors, radius, spacing } from '../../theme/tokens';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
  maxLength?: number;
  leadingIcon?: string;
  trailing?: ReactNode;
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  maxLength,
  leadingIcon,
  trailing,
}: TextFieldProps) {
  return (
    <View style={styles.field}>
      <AppText variant="small" bold>{label}</AppText>
      <View style={styles.inputRow}>
        {leadingIcon ? <Icon name={leadingIcon} size={18} color={colors.textMuted} /> : null}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          style={styles.input}
        />
        {trailing}
      </View>
    </View>
  );
}

export function PasswordVisibilityToggle({ visible, onPress }: { visible: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
      <Icon name={visible ? 'visibility-off' : 'visibility'} size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  inputRow: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.sm,
  },
});
