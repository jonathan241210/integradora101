import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, ScreenContainer, TextField } from '../components/ui';
import { colors, spacing } from '../theme/tokens';

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
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={waiting ? `Espera ${resendWaitSeconds} segundos` : 'Reenviar código'}
            accessibilityState={busy || waiting ? { disabled: true } : undefined}
            disabled={busy || waiting}
            onPress={onResend}
            style={[styles.resend, (busy || waiting) && styles.resendOff]}
          >
            <Icon name="refresh" size={22} color={colors.textOnPrimary} />
          </Pressable>
          <Button label="Confirmar código" onPress={onSubmit} disabled={busy} style={styles.confirm} />
          <View style={styles.spacer} />
        </View>
        <AppText variant="caption" color="textMuted">
          {waiting ? `Reenviar en ${resendWaitSeconds} s` : 'Reenviar código'}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  resend: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  resendOff: { opacity: 0.45 },
  spacer: { width: 52, height: 52 },
  confirm: { flexGrow: 0, paddingHorizontal: spacing.lg },
});
