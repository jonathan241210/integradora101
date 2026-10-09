import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, BackButton, Card, ProgressBar, ScreenContainer } from '../components/ui';
import { Mission } from '../models';
import { spacing } from '../theme/tokens';

interface MissionDetailScreenProps {
  mission: Mission | null;
  loading?: boolean;
  error?: string | null;
  onBackPress: () => void;
}

export function MissionDetailScreen({ mission, loading = false, error, onBackPress }: MissionDetailScreenProps) {
  if (loading) {
    return (
      <ScreenContainer>
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
        <AppText variant="title">{mission.title}</AppText>
        <Card style={styles.card}>
          <AppText variant="subheading" bold>Objetivo</AppText>
          <AppText variant="body" color="textMuted">{mission.objective}</AppText>
        </Card>
        <Card style={styles.card}>
          <AppText variant="subheading" bold>Tu progreso</AppText>
          <ProgressBar
            value={mission.total > 0 ? mission.progress / mission.total : 0}
            label={`${mission.progress} de ${mission.total} completados`}
          />
          <AppText variant="small" color="textMuted">
            {remaining === 0 ? '¡Misión completada!' : `Te ${remaining === 1 ? 'falta' : 'faltan'} ${remaining} ${remaining === 1 ? 'paso' : 'pasos'} para completar la misión.`}
          </AppText>
        </Card>
        <Card style={styles.card}>
          <AppText variant="subheading" bold>Premio</AppText>
          <AppText variant="body" color="textMuted">{mission.reward}</AppText>
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  card: { gap: spacing.sm },
});
