import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Button, Card, Icon, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

interface MemoryUnavailableScreenProps {
  title: string;
  message: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
  onBack: () => void;
}

export function MemoryUnavailableScreen({
  title,
  message,
  detail,
  actionLabel,
  onAction,
  onBack,
}: MemoryUnavailableScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBack} accessibilityLabel="Volver a mis momentos" />
        <View style={styles.titleRow}>
          <Icon name="images" size={28} color={colors.primary} />
          <AppText variant="title">{title}</AppText>
        </View>
        <Card style={styles.card}>
          <AppText variant="subheading" bold color="primary">{message}</AppText>
          <AppText variant="body" color="textMuted">{detail}</AppText>
          <Button label={actionLabel} onPress={onAction} />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radius.lg,
  },
});
