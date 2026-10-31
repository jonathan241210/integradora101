import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { spacing } from '../theme/tokens';

interface ForgotPasswordScreenProps {
  email: string;
  error: string | null;
  notice: string | null;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
  onBackPress: () => void;
  busy?: boolean;
}

export function ForgotPasswordScreen({
  email,
  error,
  notice,
  onEmailChange,
  onSubmit,
  onContinue,
  onBackPress,
  busy = false,
}: ForgotPasswordScreenProps) {
  return (
    <ScreenContainer busyMessage={busy ? 'Enviando código…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al inicio de sesión" />
        <AppText variant="heading">¿Olvidaste tu contraseña?</AppText>
        <AppText variant="body" color="textMuted">
          Escribe tu correo. El aviso no indica si la cuenta existe. Después podrás escribir el código y una contraseña nueva.
        </AppText>
        <TextField
          label="Correo electrónico"
          value={email}
          onChangeText={onEmailChange}
          placeholder="correo@ejemplo.com"
          keyboardType="email-address"
        />
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        {notice ? <AppText variant="body" accessibilityLiveRegion="polite">{notice}</AppText> : null}
        <Button label="Enviar código" onPress={onSubmit} disabled={busy} />
        {notice ? <Button label="Ya tengo el código" variant="outline" onPress={onContinue} /> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
