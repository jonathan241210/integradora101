import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer, AppText, BackButton, Card, Icon, ProgressBar, LoadingView } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { Mission } from '../models';

interface GameScreenProps {
  missions: Mission[];
  pendingScans?: { clientScanId: string; code: string }[];
  onBackPress: () => void;
  onMissionPress: (id: string) => void;
  onRetryPress?: () => void;
  loading?: boolean;
  embedded?: boolean;
}

function missionPace(missions: Mission[]): string | null {
  if (missions.length === 0) return null;
  const inProgress = missions.filter((mission) => mission.progress > 0 && mission.progress < mission.total).length;
  const notStarted = missions.filter((mission) => mission.progress <= 0).length;
  const parts = [
    inProgress > 0 ? `${inProgress} en curso` : null,
    notStarted > 0 ? `${notStarted} por empezar` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(' · ') : 'Todas las misiones de esta visita están en marcha.';
}

export function GameScreen({ missions, pendingScans = [], onBackPress, onMissionPress, onRetryPress, loading = false, embedded = false }: GameScreenProps) {
  const body = (
      <View style={loading && !embedded ? styles.loadingPage : undefined}>
      <View testID={embedded ? 'missions-intro' : undefined} style={[styles.header, embedded ? styles.headerEmbedded : null]}>
        {embedded ? null : <BackButton onPress={onBackPress} />}
        {embedded ? null : <AppText variant="title">Aventura en el Zoo</AppText>}
        {loading ? null : (
          <AppText variant="small" color="textMuted">Completa misiones y acumula puntos de exploración.</AppText>
        )}
      </View>
      {loading ? (
        <View style={styles.loadingFill}>
          <LoadingView message="Cargando misiones…" />
        </View>
      ) : (
      <View style={styles.content}>
        {pendingScans.length > 0 ? (
          <View style={styles.missionList}>
            <AppText variant="title">Escaneos pendientes</AppText>
            {pendingScans.map((scan) => (
              <Card key={scan.clientScanId} style={styles.missionCard}>
                <AppText variant="body">Pendiente</AppText>
                <AppText variant="small">{scan.code}</AppText>
              </Card>
            ))}
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Reintentar" onPress={onRetryPress}>
              <AppText variant="body" color="primary">Reintentar</AppText>
            </TouchableOpacity>
          </View>
        ) : null}
        <AppText variant="title">Misiones activas</AppText>
        {missionPace(missions) ? <AppText variant="small" color="textMuted">{missionPace(missions)}</AppText> : null}
        {missions.length === 0 ? (
          <AppText variant="body" color="textMuted">Aún no hay misiones para esta visita.</AppText>
        ) : null}
        <View style={styles.missionList}>
          {missions.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => onMissionPress(m.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalles de la misión ${m.title}`}
            >
              <Card style={styles.missionCard}>
                <View style={styles.missionTitleRow}>
                  <AppText variant="subheading" bold style={styles.missionTitle}>{m.title}</AppText>
                  <Icon name="chevron-forward" size={20} color={colors.secondary} />
                </View>
                {m.objective ? <AppText variant="small" color="textMuted">{m.objective}</AppText> : null}
                <ProgressBar
                  value={m.total > 0 ? m.progress / m.total : 0}
                  label={`${m.progress} de ${m.total}`}
                  fill="wine"
                />
                <View style={styles.rewardPill}>
                  <AppText variant="caption" bold>{m.reward}</AppText>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <AppText variant="small" color="textMuted">Cuando termines una misión, el logro queda en tu perfil.</AppText>
      </View>
      )}
      </View>
  );

  if (embedded) return body;
  return (
    <ScreenContainer scroll={!loading}>
      {body}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, alignItems: 'flex-start' },
  headerEmbedded: { paddingTop: 0 },
  loadingPage: { flex: 1 },
  loadingFill: { flex: 1, justifyContent: 'center' },
  content: { padding: spacing.lg, gap: spacing.lg },
  missionList: { gap: spacing.md, marginBottom: spacing.lg },
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  missionTitle: { flex: 1 },
  missionCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
    borderRadius: radius.lg,
  },
  rewardPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
