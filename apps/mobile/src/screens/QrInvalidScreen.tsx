import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, Button, ScreenContainer } from '../components/ui';
import { colors, spacing } from '../theme/tokens';

interface QrInvalidScreenProps {
  onRetryPress: () => void;
  onHomePress: () => void;
}

export function QrInvalidScreen({ onRetryPress, onHomePress }: QrInvalidScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <AppText variant="title" color="danger" center>¡Código inválido!</AppText>
        <AppText variant="body" center>Este código no pertenece a un animal del zoológico. Intenta escanear otro código.</AppText>
        <Button label="Reintentar" onPress={onRetryPress} />
        <Button label="Volver al inicio" variant="outline" onPress={onHomePress} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
});
