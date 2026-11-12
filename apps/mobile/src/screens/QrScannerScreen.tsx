import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Keyboard, Linking, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { AppText, BackButton, Button, Icon, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

interface QrScannerScreenProps {
  cameraGranted: boolean;
  needsPermissionPrompt: boolean;
  cameraDenied: boolean;
  busy: boolean;
  validationError: string | null;
  manualCode: string;
  onManualCodeChange: (value: string) => void;
  onRequestPermission: () => void;
  onBarcodeScanned: (result: { data: string }) => void;
  onManualSubmit: () => void;
  onBackPress?: () => void;
}

export function QrScannerScreen({
  cameraGranted,
  needsPermissionPrompt,
  cameraDenied,
  busy,
  validationError,
  manualCode,
  onManualCodeChange,
  onRequestPermission,
  onBarcodeScanned,
  onManualSubmit,
  onBackPress,
}: QrScannerScreenProps) {
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    if (busy) Keyboard.dismiss();
  }, [busy]);
  const showManual = cameraDenied || !cameraGranted || manualMode;
  const subtitle = cameraGranted && !manualMode
    ? 'Apunta la cámara al código del recinto.'
    : manualMode || cameraDenied
      ? 'Escribe el código impreso en el QR del recinto.'
      : null;

  return (
    <ScreenContainer scroll={false} contentStyle={styles.screen}>
      <View style={styles.header}>
        {onBackPress ? (
          <View style={styles.backRow}>
            <BackButton onPress={onBackPress} accessibilityLabel="Volver al animal" />
          </View>
        ) : null}
        <AppText variant="title" color="textOnPrimary" center style={styles.copy}>Escanear código QR</AppText>
        {subtitle ? (
          <AppText variant="body" color="textOnPrimary" center style={styles.copy}>{subtitle}</AppText>
        ) : null}
      </View>

      {needsPermissionPrompt ? (
        <View style={styles.permissionBox}>
          <AppText variant="body" color="textOnPrimary" center style={styles.copy}>
            Necesitamos acceso a la cámara para leer el código QR del hábitat.
          </AppText>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Permitir cámara"
            disabled={busy}
            onPress={onRequestPermission}
            style={styles.permissionButton}
          >
            <AppText variant="body" bold color="primary">Permitir cámara</AppText>
          </TouchableOpacity>
        </View>
      ) : null}

      {cameraGranted && !manualMode ? (
        <View style={styles.frame} accessibilityLabel="Vista de cámara para escanear QR">
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={busy ? undefined : onBarcodeScanned}
          />
          <View style={styles.scanLine} />
        </View>
      ) : !needsPermissionPrompt ? (
        <View style={styles.framePlaceholder}>
          <Icon name="qr-code" size={84} color={colors.accent} />
        </View>
      ) : null}

      {cameraGranted ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={manualMode ? 'Usar la cámara' : 'Escribir el código'}
          disabled={busy}
          onPress={() => setManualMode((current) => !current)}
          style={styles.modeButton}
        >
          <AppText variant="body" bold color="textOnPrimary">
            {manualMode ? 'Usar la cámara' : 'Escribir el código'}
          </AppText>
        </TouchableOpacity>
      ) : null}

      {showManual ? (
        <View style={styles.manual} accessibilityLabel="Entrada manual de código">
          {cameraDenied ? (
            <AppText variant="body" color="textOnPrimary" center style={styles.copy}>
              No pudimos usar la cámara. Escribe el código impreso en el QR o abre los ajustes del teléfono para activar el permiso.
            </AppText>
          ) : null}
          {cameraDenied ? (
            <Button
              label="Abrir ajustes"
              variant="soft"
              onPress={() => void Linking.openSettings()}
              disabled={busy}
            />
          ) : null}
          <TextInput
            value={manualCode}
            onChangeText={onManualCodeChange}
            placeholder="ARCA-XXXXXXXX"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!busy}
            style={styles.input}
            accessibilityLabel="Código del recinto"
          />
          <Button
            label="Registrar código"
            onPress={() => {
              Keyboard.dismiss();
              void onManualSubmit();
            }}
            disabled={busy || manualCode.trim().length === 0}
          />
        </View>
      ) : null}

      {validationError ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <AppText variant="body" color="danger" center style={styles.copy}>
            {validationError}
          </AppText>
        </View>
      ) : null}

      {busy ? (
        <View style={styles.loading} accessibilityLabel="Procesando escaneo">
          <ActivityIndicator color={colors.accent} size="large" />
          <AppText variant="body" color="textOnPrimary" center style={styles.copy}>
            {cameraGranted && !manualMode
              ? 'Ya leímos el código. Puedes apartar la cámara; estamos registrando el descubrimiento.'
              : 'Estamos registrando el código.'}
          </AppText>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg, gap: spacing.md, backgroundColor: colors.primary },
  header: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  backRow: { alignSelf: 'flex-start' },
  copy: { width: '100%', textAlign: 'center' },
  permissionBox: { gap: spacing.md, width: '100%', alignItems: 'center' },
  permissionButton: {
    backgroundColor: colors.textOnPrimary,
    borderRadius: radius.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  modeButton: { borderColor: colors.textOnPrimary, backgroundColor: 'transparent', alignSelf: 'center' },
  frame: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    alignSelf: 'center',
    borderWidth: 4,
    borderColor: colors.accent,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  framePlaceholder: {
    width: 250,
    height: 250,
    borderWidth: 4,
    borderColor: colors.accent,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    top: '50%',
    height: 2,
    backgroundColor: colors.accent,
  },
  manual: { width: '100%', gap: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
  },
  loading: { alignItems: 'center', gap: spacing.sm, width: '100%' },
  errorBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
