import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { AvatarPicker } from '../components/AvatarPicker';
import { AppText, BackButton, Button, Card, Icon, ScreenContainer, TextField } from '../components/ui';
import { AVATAR_LABELS, AvatarCode } from '../constants/avatarCatalog';
import { colors, spacing } from '../theme/tokens';

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
  const [pickerOpen, setPickerOpen] = useState(false);
  const avatarName = avatarCode ? AVATAR_LABELS[avatarCode] : 'Avatar';

  const chooseAvatar = (code: AvatarCode) => {
    onAvatarChange(code);
    setPickerOpen(false);
  };

  return (
    <ScreenContainer busyMessage={busy ? 'Guardando perfil…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver a ajustes" />
        <AppText variant="title">Editar cuenta</AppText>
        <AppText variant="small" color="textMuted">{email}</AppText>
        <AppText variant="small">El perfil visible del menor muestra solo el apodo y el avatar.</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Editar imagen"
          onPress={() => setPickerOpen(true)}
          style={styles.profile}
        >
          <View style={styles.circle}>
            <AppText variant="small" center bold>{avatarName}</AppText>
          </View>
          <AppText variant="caption" style={styles.editLabel}>Editar imagen</AppText>
        </Pressable>
        <TextField label="Nombre" value={firstName} onChangeText={onFirstNameChange} autoCapitalize="words" />
        <TextField label="Apodo" value={nickname} onChangeText={onNicknameChange} autoCapitalize="words" />
        {notice ? <AppText variant="small">{notice}</AppText> : null}
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Guardar perfil" onPress={onSave} disabled={busy} />
        <Card style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cambiar contraseña" onPress={onChangePassword} style={styles.actionRow}>
            <AppText variant="body" style={styles.actionLabel}>Cambiar contraseña</AppText>
            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar cuenta" onPress={onDeleteAccount} style={styles.actionRow}>
            <AppText variant="body" color="danger" style={styles.actionLabel}>Borrar cuenta</AppText>
            <Icon name="chevron-forward" size={20} color={colors.danger} />
          </Pressable>
        </Card>
      </View>
      <Modal visible={pickerOpen} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Cerrar selector de avatar" onPress={() => setPickerOpen(false)} style={[styles.backdropTap, styles.dim]} />
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>
            <AppText variant="subheading" center>Elige tu avatar</AppText>
            <AvatarPicker value={avatarCode} onChange={chooseAvatar} />
            <Button label="Cerrar" variant="outline" onPress={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  profile: { alignItems: 'center', gap: spacing.sm, alignSelf: 'center' },
  circle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.secondary,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  editLabel: { color: colors.secondary, fontWeight: '600' },
  actions: { backgroundColor: colors.surface, gap: 0, paddingVertical: spacing.xs },
  actionRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: spacing.sm },
  actionLabel: { flex: 1 },
  divider: { height: 1, backgroundColor: colors.accent },
  backdrop: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  backdropTap: { ...StyleSheet.absoluteFillObject },
  dim: { backgroundColor: colors.text, opacity: 0.45 },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
