import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ScreenContainer, TextField } from '../components/ui';
import { spacing } from '../theme/tokens';

interface VerifyEmailScreenProps {
  email: string;
  code: string;
  error: string | null;
  notice: string | null;
  resendWaitSeconds: number | null;
  onCodeChange: (value: string) => void;
  onSubmit: () => void;
  onResend: () => void;
  busy?: boolean;
}

export function VerifyEmailScreen({
  email,
  code,
  error,
  notice,
  resendWaitSeconds,
  onCodeChange,
  onSubmit,
  onResend,
  busy = false,
}: VerifyEmailScreenProps) {
  const waiting = resendWaitSeconds !== null && resendWaitSeconds > 0;
  return (
    <ScreenContainer busyMessage={busy ? 'Verificando correo…' : null}>
      <View style={styles.page}>
        <AppText variant="title">Verifica tu correo</AppText>
        <AppText variant="body">Escribe el código de 6 dígitos para {email || 'tu correo'}. En esta versión de prueba el código es 123456.</AppText>
        <TextField label="Código" value={code} onChangeText={onCodeChange} keyboardType="number-pad" maxLength={6} placeholder="000000" />
        {notice ? <AppText variant="small">{notice}</AppText> : null}
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <Button label="Confirmar código" onPress={onSubmit} disabled={busy} />
        <Button
          label={waiting ? `Espera ${resendWaitSeconds} segundos` : 'Reenviar código'}
          variant="outline"
          disabled={busy || waiting}
          onPress={waiting || busy ? () => undefined : onResend}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
});
