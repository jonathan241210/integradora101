import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AvatarPicker } from '../components/AvatarPicker';
import { AppText, BackButton, Button, Icon, ScreenContainer, TextField } from '../components/ui';
import { AvatarCode } from '../constants/avatarCatalog';
import { colors, radius, spacing } from '../theme/tokens';

const STEPS = ['Tus datos', 'Tu acceso', 'Tu avatar'] as const;

function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.check}
    >
      <View style={[styles.box, checked && styles.boxOn]}>
        {checked ? <AppText variant="body" bold color="textOnPrimary" style={styles.mark}>✓</AppText> : null}
      </View>
      <AppText variant="body" style={styles.checkLabel}>{label}</AppText>
    </Pressable>
  );
}
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [step, setStep] = useState(0);
  const [stepError, setStepError] = useState<string | null>(null);
  const notice = stepError ?? error;

  const continueStep = () => {
    if (step === 0) {
      if (!firstName.trim() || !nickname.trim() || !email.trim()) {
        setStepError('Completa nombre, apodo y correo.');
        return;
      }
      if (!EMAIL_PATTERN.test(email.trim())) {
        setStepError('Escribe un correo válido.');
        return;
      }
    }
    if (step === 1) {
      if (!password || !confirmation) {
        setStepError('Escribe la contraseña y confírmala.');
        return;
      }
      if (password !== confirmation) {
        setStepError('La confirmación no coincide con la contraseña.');
        return;
      }
      if (!isAdult) {
        setStepError('Confirma que eres mayor de 18 años.');
        return;
      }
      if (!acceptedPrivacy) {
        setStepError('Acepta el aviso de privacidad.');
        return;
      }
    }
    setStepError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  return (
    <ScreenContainer busyMessage={busy ? 'Creando cuenta…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBackPress} accessibilityLabel="Volver al inicio de sesión" />
        <AppText variant="title">Crear cuenta</AppText>
        <AppText variant="body" color="textMuted">{STEPS[step]}</AppText>
        <View style={styles.steps} accessibilityLabel={`Paso ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((label, index) => (
            <View key={label} style={[styles.dot, index === step ? styles.dotActive : index < step ? styles.dotDone : null]} />
          ))}
        </View>

        {step === 0 ? (
          <View style={styles.section}>
            <TextField label="Nombre" value={firstName} onChangeText={onFirstNameChange} autoCapitalize="words" />
            <TextField label="Apodo" value={nickname} onChangeText={onNicknameChange} autoCapitalize="words" />
            <TextField label="Correo electrónico" value={email} onChangeText={onEmailChange} placeholder="correo@ejemplo.com" keyboardType="email-address" />
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.section}>
            <TextField label="Contraseña" value={password} onChangeText={onPasswordChange} secureTextEntry />
            <TextField label="Confirmar contraseña" value={confirmation} onChangeText={onConfirmationChange} secureTextEntry />
            <CheckRow checked={isAdult} label="Soy mayor de 18 años" onPress={onToggleAdult} />
            <CheckRow checked={acceptedPrivacy} label="Acepto el aviso de privacidad" onPress={onTogglePrivacy} />
            <Pressable accessibilityRole="button" accessibilityLabel="Leer aviso de privacidad" onPress={onOpenPrivacy}>
              <AppText variant="small" color="primary">Leer aviso de privacidad</AppText>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.section}>
            <AppText variant="body" center>Elige el avatar que verá quien use esta cuenta.</AppText>
            <AvatarPicker value={avatarCode} onChange={onAvatarChange} />
          </View>
        ) : null}

        {notice ? <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{notice}</AppText> : null}
        <View style={styles.nav}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Anterior"
              disabled={busy}
              onPress={() => { setStepError(null); setStep((current) => current - 1); }}
              style={styles.arrow}
            >
              <Icon name="arrow-back" size={22} color={colors.textOnPrimary} />
            </Pressable>
          ) : <View style={styles.arrowSpacer} />}
          {step === STEPS.length - 1 ? (
            <Button label="Crear cuenta" onPress={onSubmit} disabled={busy} style={styles.create} />
          ) : <View style={styles.createSlot} />}
          {step < STEPS.length - 1 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Siguiente"
              disabled={busy}
              onPress={continueStep}
              style={styles.arrow}
            >
              <Icon name="chevron-forward" size={22} color={colors.textOnPrimary} />
            </Pressable>
          ) : <View style={styles.arrowSpacer} />}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  steps: { flexDirection: 'row', gap: spacing.sm },
  dot: { flex: 1, height: 6, borderRadius: radius.pill, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.secondary },
  dotDone: { backgroundColor: colors.accent },
  section: { gap: spacing.md },
  check: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  box: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: colors.primary },
  mark: { fontSize: 18, lineHeight: 22 },
  checkLabel: { flex: 1 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  arrowSpacer: { width: 52, height: 52 },
  arrow: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  create: { flexGrow: 0, paddingHorizontal: spacing.lg },
  createSlot: { width: 52 },
});
