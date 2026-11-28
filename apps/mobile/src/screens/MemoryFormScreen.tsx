import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, Card, Icon, ScreenContainer, TextField } from '../components/ui';
import {
  CHANGE_IMAGE,
  CHANGE_OPINION,
  CONFIRM_CORRECTION,
  CONFIRM_CORRECTION_BODY,
  CONSENT_TEXT,
  DENIED_TEXT,
  statusLabel,
} from '../memories/memoryCopy';
import { colors, spacing } from '../theme/tokens';

interface MemoryFormScreenProps {
  title: string;
  opinion: string;
  consent: boolean;
  fileName: string | null;
  imageError: string | null;
  opinionError: string | null;
  consentError: string | null;
  banner: string | null;
  success: string | null;
  busy: boolean;
  permissionDenied: boolean;
  canSend: boolean;
  requiresConfirmation: boolean;
  reason: string | null;
  rejectedFields: Array<'image' | 'content'>;
  onOpinionChange: (value: string) => void;
  onToggleConsent: () => void;
  onChooseImage: () => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function MemoryFormScreen({
  title,
  opinion,
  consent,
  fileName,
  imageError,
  opinionError,
  consentError,
  banner,
  success,
  busy,
  permissionDenied,
  canSend,
  requiresConfirmation,
  reason,
  rejectedFields,
  onOpinionChange,
  onToggleConsent,
  onChooseImage,
  onSubmit,
  onBack,
}: MemoryFormScreenProps) {
  const [ask, setAsk] = useState(false);
  const count = `${opinion.length} de 300 caracteres`;
  const locked = success != null;

  function pressSend() {
    if (!canSend || locked) return;
    if (requiresConfirmation) {
      setAsk(true);
      return;
    }
    onSubmit();
  }

  return (
    <ScreenContainer busyMessage={busy ? 'Enviando petición…' : null}>
      <View style={styles.page}>
        <BackButton onPress={onBack} accessibilityLabel="Volver a mis momentos" />
        <AppText variant="title">{title}</AppText>

        {reason ? (
          <Card style={styles.notice}>
            <AppText variant="small" bold>Motivo</AppText>
            <AppText variant="body">{reason}</AppText>
          </Card>
        ) : null}

        {rejectedFields.includes('image') ? (
          <AppText variant="body" accessibilityLiveRegion="polite">{CHANGE_IMAGE}</AppText>
        ) : null}
        {rejectedFields.includes('content') ? (
          <AppText variant="body" accessibilityLiveRegion="polite">{CHANGE_OPINION}</AppText>
        ) : null}

        {locked ? null : (
          <Card style={styles.card}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Elegir foto"
              onPress={onChooseImage}
              style={styles.photo}
            >
              <Icon name="images" size={28} color={colors.primary} />
              <View style={styles.flex}>
                <AppText variant="subheading" bold>{fileName ?? 'Elegir foto'}</AppText>
                <AppText variant="small" color="textMuted">JPG, PNG o WebP, hasta 5 MB</AppText>
              </View>
            </Pressable>
            {permissionDenied ? (
              <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{DENIED_TEXT}</AppText>
            ) : null}
            {imageError ? (
              <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{imageError}</AppText>
            ) : null}
          </Card>
        )}

        {locked ? null : (
          <>
            <TextField
              label="Opinión (opcional)"
              value={opinion}
              onChangeText={onOpinionChange}
              placeholder="Cuéntanos el momento, si quieres"
              autoCapitalize="sentences"
              multiline
            />
            <AppText variant="caption" color="textMuted" accessibilityLabel={count}>{count}</AppText>
            {opinionError ? (
              <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{opinionError}</AppText>
            ) : null}

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consent }}
              accessibilityLabel={CONSENT_TEXT}
              onPress={onToggleConsent}
              style={styles.check}
            >
              <View style={[styles.box, consent && styles.boxOn]}>
                {consent ? <AppText variant="body" bold color="textOnPrimary" style={styles.mark}>✓</AppText> : null}
              </View>
              <AppText variant="body" style={styles.flex}>{CONSENT_TEXT}</AppText>
            </Pressable>
            {consentError ? (
              <AppText variant="small" color="danger" accessibilityLiveRegion="polite">{consentError}</AppText>
            ) : null}
          </>
        )}

        {banner ? (
          <AppText variant="body" color="danger" accessibilityLiveRegion="polite">{banner}</AppText>
        ) : null}
        {success ? (
          <Card style={styles.success}>
            <AppText variant="subheading" bold>{statusLabel('submitted')}</AppText>
            <AppText variant="body">{success}</AppText>
          </Card>
        ) : null}

        {locked ? null : ask ? (
          <Card style={styles.notice}>
            <AppText variant="subheading" bold>{CONFIRM_CORRECTION}</AppText>
            <AppText variant="body">{CONFIRM_CORRECTION_BODY}</AppText>
            <Button label="Sí, enviar" onPress={() => { setAsk(false); onSubmit(); }} />
            <Button label="Cancelar" variant="outline" onPress={() => setAsk(false)} />
          </Card>
        ) : (
          <Button label="Enviar petición" onPress={pressSend} disabled={!canSend} />
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  photo: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  notice: {
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  success: {
    padding: spacing.md,
    gap: spacing.xs,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  check: { minHeight: 48, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  box: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  boxOn: { backgroundColor: colors.primary },
  mark: { fontSize: 18, lineHeight: 22 },
});
