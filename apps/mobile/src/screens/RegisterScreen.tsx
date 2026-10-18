import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

interface RegisterScreenProps {
  username: string;
  email: string;
  password: string;
  confirmation: string;
  error: string | null;
  warning: string;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: () => void;
  onBackPress: () => void;
}

export function RegisterScreen({
  username,
  email,
  password,
  confirmation,
  error,
  warning,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
  onBackPress,
}: RegisterScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al inicio de sesión" />
        <AppText variant="heading">Crear cuenta</AppText>
        <AppText variant="body" color="textMuted">
          La cuenta de visitante usa nombre de usuario, correo y contraseña.
        </AppText>
        <TextField label="Nombre de usuario" value={username} onChangeText={onUsernameChange} autoCapitalize="words" />
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={onEmailChange}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
        />
        <TextField label="Contraseña" value={password} onChangeText={onPasswordChange} secureTextEntry />
        <TextField label="Confirmar contraseña" value={confirmation} onChangeText={onConfirmationChange} secureTextEntry />
        <View style={styles.warning} accessibilityRole="alert">
          <AppText variant="small" bold>Advertencia</AppText>
          <AppText variant="small">{warning}</AppText>
        </View>
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Crear cuenta" onPress={onSubmit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  warning: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
