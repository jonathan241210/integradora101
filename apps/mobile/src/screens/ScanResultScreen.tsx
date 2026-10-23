import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppText, BackButton, Button, Card, ScreenContainer } from '../components/ui';
import { spacing } from '../theme/tokens';
import type { ScanPresentation } from '../services/scanQueue';

interface ScanResultScreenProps {
  result: ScanPresentation;
  onBackPress: () => void;
  onRetryPress?: () => void;
}

export function ScanResultScreen({ result, onBackPress, onRetryPress }: ScanResultScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <BackButton onPress={onBackPress} />
        <AppText variant="title" accessibilityRole="header">{result.title}</AppText>
        <Card style={styles.card}>
          <AppText variant="body">{result.message}</AppText>
          {result.kind === 'discovered' && result.newSpecies && result.newSpecies.length > 0 ? (
            <AppText variant="body">Especies: {result.newSpecies.join(', ')}</AppText>
          ) : null}
          {result.kind === 'discovered' && result.pointsAwarded !== undefined ? (
            <AppText variant="body">{result.pointsAwarded} puntos</AppText>
          ) : null}
        </Card>
        {result.kind === 'pending' || result.kind === 'rate_limited' ? (
          <Button label="Reintentar" onPress={onRetryPress ?? onBackPress} />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
});
