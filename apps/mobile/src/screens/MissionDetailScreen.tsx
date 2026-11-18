import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ProgressBar, ScreenContainer } from '../components/ui';
import { Mission } from '../models';
import { colors, radius, spacing } from '../theme/tokens';

interface MissionDetailScreenProps {
  mission: Mission | null;
  loading?: boolean;
  error?: string | null;
  onBackPress: () => void;
}

export function MissionDetailScreen({ mission, loading = false, error, onBackPress }: MissionDetailScreenProps) {
  if (loading) {
    return (
      <ScreenContainer scroll={false}>
        <View style={styles.message}>
          <AppText variant="body">Cargando información de la misión…</AppText>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">{error}</AppText>
          <BackButton onPress={onBackPress} />
        </View>
      </ScreenContainer>
    );
  }

  if (!mission) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">No se encontró la misión.</AppText>
          <BackButton onPress={onBackPress} />
        </View>
      </ScreenContainer>
    );
  }

  const remaining = Math.max(0, mission.total - mission.progress);

  return (
    <ScreenContainer>
      <View style={styles.content}>
        <BackButton onPress={onBackPress} />
        <View style={styles.hero}>
          <AppText variant="overline" color="textOnPrimary">Misión</AppText>
          <AppText variant="title" color="textOnPrimary">{mission.title}</AppText>
          <View style={styles.rewardPill}>
            <AppText variant="caption" bold>{mission.reward}</AppText>
          </View>
        </View>
        <Card style={styles.card}>
          <AppText variant="subheading" bold color="primary">Objetivo</AppText>
          <AppText variant="body">{mission.objective}</AppText>
        </Card>
        <Card style={styles.progressCard}>
          <AppText variant="subheading" bold color="primary">Tu progreso</AppText>
          <ProgressBar
            value={mission.total > 0 ? mission.progress / mission.total : 0}
            label={`${mission.progress} de ${mission.total} completados`}
            fill="wine"
          />
          <AppText variant="small" color="textMuted">
            {remaining === 0 ? '¡Misión completada!' : `Te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining} ${remaining === 1 ? 'paso' : 'pasos'} para completar la misión.`}
          </AppText>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rewardPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  card: {
    gap: spacing.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  progressCard: {
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
});
