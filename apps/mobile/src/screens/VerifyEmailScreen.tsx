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
  onGoToLogin: () => void;
  alreadyRegistered?: boolean;
  showTestCode?: boolean;
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
  onGoToLogin,
  alreadyRegistered = false,
  showTestCode = false,
  busy = false,
}: VerifyEmailScreenProps) {
  const waiting = resendWaitSeconds !== null && resendWaitSeconds > 0;
  const hint = `Escribe el código de 6 dígitos para ${email || 'tu correo'}.`;
  if (alreadyRegistered) {
    return (
      <ScreenContainer>
        <View style={styles.page}>
          <AppText variant="title">Correo ya registrado</AppText>
          <AppText variant="body">{notice ?? 'Ese correo ya está registrado.'}</AppText>
          <Button label="Ir a iniciar sesión" onPress={onGoToLogin} />
        </View>
      </ScreenContainer>
    );
  }
  return (
    <ScreenContainer busyMessage={busy ? 'Verificando correo…' : null}>
      <View style={styles.page}>
        <AppText variant="title">Verifica tu correo</AppText>
        <AppText variant="body">{showTestCode ? `${hint} En esta versión de prueba el código es 123456.` : hint}</AppText>
        <TextField label="Código" value={code} onChangeText={onCodeChange} keyboardType="number-pad" maxLength={6} placeholder="000000" />
        {notice ? <AppText variant="small">{notice}</AppText> : null}
        {error ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{error}</AppText> : null}
        <View style={styles.nav}>
          <View style={styles.resendWrap}>
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
            <AppText variant="caption" color="textMuted" center>
              {waiting ? `${resendWaitSeconds} s` : 'Reenviar'}
            </AppText>
          </View>
          <Button label="Confirmar código" onPress={onSubmit} disabled={busy} style={styles.confirm} />
          <View style={styles.spacer} />
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  nav: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: spacing.sm },
  resendWrap: { alignItems: 'center', gap: spacing.xs, minWidth: 52 },
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
