import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AvatarPicker } from '../components/AvatarPicker';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { AvatarCode } from '../constants/avatarCatalog';
import { spacing } from '../theme/tokens';

interface RegisterScreenProps {
  firstName: string;
  nickname: string;
  email: string;
  password: string;
  confirmation: string;
  avatarCode: AvatarCode | null;
  isAdult: boolean;
  acceptedPrivacy: boolean;
  error: string | null;
  onFirstNameChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onAvatarChange: (code: AvatarCode) => void;
  onToggleAdult: () => void;
  onTogglePrivacy: () => void;
  onOpenPrivacy: () => void;
  onSubmit: () => void;
  onBackPress: () => void;
  busy?: boolean;
}

export function RegisterScreen({
  firstName,
  nickname,
  email,
  password,
  confirmation,
  avatarCode,
  isAdult,
  acceptedPrivacy,
  error,
  onFirstNameChange,
  onNicknameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmationChange,
  onAvatarChange,
  onToggleAdult,
  onTogglePrivacy,
  onOpenPrivacy,
  onSubmit,
  onBackPress,
  busy = false,
}: RegisterScreenProps) {
  return (
    <ScreenContainer busyMessage={busy ? 'Creando cuenta…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al inicio de sesión" />
        <AppText variant="heading">Crear cuenta</AppText>
        <TextField label="Nombre" value={firstName} onChangeText={onFirstNameChange} autoCapitalize="words" />
        <TextField label="Apodo" value={nickname} onChangeText={onNicknameChange} autoCapitalize="words" />
        <TextField label="Correo electrónico" value={email} onChangeText={onEmailChange} placeholder="correo@ejemplo.com" keyboardType="email-address" />
        <TextField label="Contraseña" value={password} onChangeText={onPasswordChange} secureTextEntry />
        <TextField label="Confirmar contraseña" value={confirmation} onChangeText={onConfirmationChange} secureTextEntry />
        <AppText variant="small" bold>Avatar</AppText>
        <AvatarPicker value={avatarCode} onChange={onAvatarChange} />
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: isAdult }} accessibilityLabel="Soy mayor de 18 años" onPress={onToggleAdult} style={styles.check}>
          <AppText variant="body">{isAdult ? '☑' : '☐'} Soy mayor de 18 años</AppText>
        </Pressable>
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acceptedPrivacy }} accessibilityLabel="Acepto el aviso de privacidad" onPress={onTogglePrivacy} style={styles.check}>
          <AppText variant="body">{acceptedPrivacy ? '☑' : '☐'} Acepto el aviso de privacidad</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Leer aviso de privacidad" onPress={onOpenPrivacy}>
          <AppText variant="small" color="primary">Leer aviso de privacidad</AppText>
        </Pressable>
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Crear cuenta" onPress={onSubmit} disabled={busy} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  check: { minHeight: 44, justifyContent: 'center' },
});
