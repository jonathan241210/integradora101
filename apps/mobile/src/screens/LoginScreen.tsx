import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, PasswordVisibilityToggle, ScreenContainer, TextField } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { APP_NAME } from '../constants';

interface LoginScreenProps {
  email: string;
  password: string;
  error: string | null;
  busy?: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: () => void;
  onForgotPassword: () => void;
  onRegister: () => void;
}

export function LoginScreen({
  email,
  password,
  error,
  busy = false,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onForgotPassword,
  onRegister,
}: LoginScreenProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <ScreenContainer busyMessage={busy ? 'Iniciando sesión…' : null}>
      <View style={styles.page}>
        <View style={styles.brand}>
          <View style={styles.pawWrap}>
            <Icon name="paw" size={36} color={colors.primary} />
          </View>
          <AppText variant="heading" center color="textOnPrimary">{APP_NAME}</AppText>
          <AppText variant="body" center color="textOnPrimary">Descubre el zoológico como un explorador</AppText>
        </View>

        <AppText variant="title">Iniciar sesión</AppText>
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={onEmailChange}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
          leadingIcon="mail"
        />
        <TextField
          label="Contraseña"
          value={password}
          onChangeText={onPasswordChange}
          placeholder="Escribe tu contraseña"
          secureTextEntry={!passwordVisible}
          leadingIcon="lock"
          trailing={<PasswordVisibilityToggle visible={passwordVisible} onPress={() => setPasswordVisible((current) => !current)} />}
        />
        <Pressable onPress={onForgotPassword} accessibilityRole="button" accessibilityLabel="¿Olvidaste tu contraseña?" style={styles.forgot}>
          <AppText variant="small" color="primary">¿Olvidaste tu contraseña?</AppText>
        </Pressable>
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Iniciar sesión" onPress={onSubmit} disabled={busy} />
        <View style={styles.footer}>
          <AppText variant="small" color="textMuted">¿No tienes cuenta?</AppText>
          <Pressable onPress={onRegister} accessibilityRole="button" accessibilityLabel="Regístrate">
            <AppText variant="small" color="primary" bold>Regístrate</AppText>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  brand: {
    backgroundColor: colors.base,
    borderRadius: radius.xl * 2,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  pawWrap: {
    width: 88,
    height: 88,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  forgot: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.xs },
});
