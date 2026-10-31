import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AvatarPicker } from '../components/AvatarPicker';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { AvatarCode } from '../constants/avatarCatalog';
import { spacing } from '../theme/tokens';

interface AccountSettingsScreenProps {
  email: string;
  firstName: string;
  nickname: string;
  avatarCode: AvatarCode | null;
  error: string | null;
  notice: string | null;
  onFirstNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onAvatarChange: (code: AvatarCode) => void;
  onSave: () => void;
  onChangePassword: () => void;
  onDeleteAccount: () => void;
  onBackPress: () => void;
  busy?: boolean;
}

export function AccountSettingsScreen({
  email,
  firstName,
  nickname,
  avatarCode,
  error,
  notice,
  onFirstNameChange,
  onNicknameChange,
  onAvatarChange,
  onSave,
  onChangePassword,
  onDeleteAccount,
  onBackPress,
  busy = false,
}: AccountSettingsScreenProps) {
  return (
    <ScreenContainer busyMessage={busy ? 'Guardando perfil…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver a ajustes" />
        <AppText variant="heading">Editar cuenta</AppText>
        <AppText variant="small" color="textMuted">{email}</AppText>
        <AppText variant="small">El perfil visible del menor muestra solo el apodo y el avatar.</AppText>
        <TextField label="Nombre" value={firstName} onChangeText={onFirstNameChange} autoCapitalize="words" />
        <TextField label="Apodo" value={nickname} onChangeText={onNicknameChange} autoCapitalize="words" />
        <AvatarPicker value={avatarCode} onChange={onAvatarChange} />
        {notice ? <AppText variant="small">{notice}</AppText> : null}
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Guardar perfil" onPress={onSave} disabled={busy} />
        <Button label="Cambiar contraseña" variant="outline" onPress={onChangePassword} />
        <Button label="Borrar cuenta" variant="danger" onPress={onDeleteAccount} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
