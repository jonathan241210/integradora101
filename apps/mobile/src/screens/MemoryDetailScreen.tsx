import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ScreenContainer } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';

export type MemoryDetailModel = {
  title: string;
  opinion: string | null;
  status: 'submitted' | 'in_review' | 'accepted' | 'rejected';
  statusLabel: string;
  sentAt: string | null;
  note: string | null;
};

interface MemoryDetailScreenProps {
  detail: MemoryDetailModel;
  onBack: () => void;
}

export function MemoryDetailScreen({ detail, onBack }: MemoryDetailScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.page}>
        <BackButton onPress={onBack} accessibilityLabel="Volver a mis memorias" />
        <AppText variant="title">Tu memoria</AppText>

        <Card style={styles.sent}>
          <AppText variant="subheading" bold color="primary">Lo que enviaste</AppText>
          <AppText variant="body" color="textMuted">
            {detail.opinion ?? 'Sin opinión'}
          </AppText>
          {detail.sentAt ? <AppText variant="small" color="textMuted">{detail.sentAt}</AppText> : null}
        </Card>

        <Card style={styles.status}>
          <AppText variant="subheading" bold color="primary">Estado de la petición</AppText>
          <AppText variant="body">{detail.statusLabel}</AppText>
          {detail.note ? <AppText variant="body" color="textMuted">{detail.note}</AppText> : null}
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { padding: spacing.lg, gap: spacing.md },
  sent: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
    borderRadius: radius.lg,
  },
  status: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radius.lg,
  },
});
