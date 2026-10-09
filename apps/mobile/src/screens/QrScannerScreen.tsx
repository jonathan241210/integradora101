import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, Icon, ScreenContainer } from '../components/ui';
import { colors, spacing, radius } from '../theme/tokens';

interface QrScannerScreenProps {
  onValidPress: () => void;
  onInvalidPress: () => void;
  onAlreadyDiscoveredPress: () => void;
}

export function QrScannerScreen({ onValidPress, onInvalidPress, onAlreadyDiscoveredPress }: QrScannerScreenProps) {
  return (
    <ScreenContainer scroll={false} contentStyle={styles.screen}>
      <View style={styles.header}>
        <AppText variant="title" color="textOnPrimary">Escanear Código QR</AppText>
        <AppText variant="body" color="textOnPrimary">Apunta la cámara al código del hábitat</AppText>
      </View>
      <View style={styles.frame}>
        <Icon name="qr-code" size={84} color={colors.accent} />
        <View style={styles.scanLine} />
      </View>
      {__DEV__ ? (
        <View style={styles.prototypes}>
          <AppText variant="caption" color="textOnPrimary" center>Opciones de demostración</AppText>
          <Button label="Simular QR válido" onPress={onValidPress} />
          <Button label="Simular QR inválido" variant="soft" onPress={onInvalidPress} />
          <Button label="Simular ya descubierto" variant="outline" onPress={onAlreadyDiscoveredPress} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'space-around', padding: spacing.lg, backgroundColor: colors.primary },
  header: { alignItems: 'center', gap: spacing.sm },
  frame: { width: 250, height: 250, borderWidth: 4, borderColor: colors.accent, borderRadius: radius.xl, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scanLine: { position: 'absolute', left: spacing.md, right: spacing.md, top: '50%', height: 2, backgroundColor: colors.accent },
  prototypes: { width: '100%', gap: spacing.sm },
});
