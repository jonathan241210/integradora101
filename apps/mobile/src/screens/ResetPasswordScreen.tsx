import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, ScreenContainer, TextField } from '../components/ui';
import { spacing } from '../theme/tokens';

interface ResetPasswordScreenProps {
  email: string;
  code: string;
  password: string;
  confirmation: string;
  error: string | null;
  onCodeChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: () => void;
  onBackPress: () => void;
}

export function ResetPasswordScreen({
  email,
  code,
  password,
  confirmation,
  error,
  onCodeChange,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
  onBackPress,
}: ResetPasswordScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver a solicitar el código" />
        <AppText variant="heading">Nueva contraseña</AppText>
        <AppText variant="body" color="textMuted">
          {email ? `Código para ${email}.` : 'Escribe el código que llegaría a tu correo.'} En esta versión de prueba el código es 123456.
        </AppText>
        <TextField label="Código" value={code} onChangeText={onCodeChange} keyboardType="number-pad" maxLength={6} placeholder="000000" />
        <TextField label="Nueva contraseña" value={password} onChangeText={onPasswordChange} secureTextEntry />
        <TextField label="Confirmar contraseña" value={confirmation} onChangeText={onConfirmationChange} secureTextEntry />
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Restablecer contraseña" onPress={onSubmit} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
