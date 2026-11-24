import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer, AppText, BackButton, Card, Chip, Icon, ProgressBar, LoadingView } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { Mission } from '../models';
import { VisitorDataNotice } from '../components/ui/VisitorDataGate';

export interface MissionsAccess {
  status: 'guest' | 'error';
  error?: string | null;
  onLogin: () => void;
  onRetry: () => void;
}

interface GameScreenProps {
  missions: Mission[];
  pendingScans?: { clientScanId: string; code: string }[];
  onBackPress: () => void;
  onMissionPress: (id: string) => void;
  onRetryPress?: () => void;
  onAchievementsPress?: () => void;
  loading?: boolean;
  embedded?: boolean;
  /** Sin sesión o con error: reemplaza la lista de misiones por el aviso correspondiente. */
  access?: MissionsAccess;
}

type MissionFilter = 'inProgress' | 'notStarted';

function isComplete(mission: Mission): boolean {
  return mission.total > 0 && mission.progress >= mission.total;
}

function MissionCard({ mission, done = false, onPress }: { mission: Mission; done?: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalles de la misión ${mission.title}`}
    >
      <Card style={[styles.missionCard, done ? styles.missionCardDone : null]}>
        <View style={styles.missionTitleRow}>
          <AppText variant="subheading" bold style={styles.missionTitle}>{mission.title}</AppText>
          <Icon name="chevron-forward" size={20} color={done ? colors.primary : colors.secondary} />
        </View>
        {mission.objective ? <AppText variant="small" color="textMuted">{mission.objective}</AppText> : null}
        <ProgressBar
          value={mission.total > 0 ? mission.progress / mission.total : 0}
          label={`${mission.progress} de ${mission.total}`}
          fill="wine"
        />
        <View style={styles.rewardPill}>
          <AppText variant="caption" bold>{mission.reward}</AppText>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function GameScreen({ missions, pendingScans = [], onBackPress, onMissionPress, onRetryPress, onAchievementsPress, loading = false, embedded = false, access }: GameScreenProps) {
  const [filter, setFilter] = useState<MissionFilter | null>(null);
  const active = missions.filter((mission) => !isComplete(mission));
  const completed = missions.filter(isComplete);
  const inProgress = active.filter((mission) => mission.progress > 0);
  const notStarted = active.filter((mission) => mission.progress <= 0);
  const shown = filter === 'inProgress' ? inProgress : filter === 'notStarted' ? notStarted : active;
  const body = (
      <View style={loading && !embedded ? styles.loadingPage : undefined}>
      <View testID={embedded ? 'missions-intro' : undefined} style={[styles.header, embedded ? styles.headerEmbedded : null]}>
        {embedded ? null : <BackButton onPress={onBackPress} />}
        {embedded ? null : <AppText variant="title">Aventura en el Zoo</AppText>}
        {loading || access ? null : (
          <AppText variant="small" color="textMuted">Completa misiones y acumula puntos de exploración.</AppText>
        )}
      </View>
      {access ? (
        <VisitorDataNotice
          status={access.status}
          error={access.error}
          onLogin={access.onLogin}
          onRetry={access.onRetry}
        />
      ) : loading ? (
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
        {missions.length === 0 ? (
          <AppText variant="body" color="textMuted">Aún no hay misiones para esta visita.</AppText>
        ) : (
          <View style={styles.filters}>
            {inProgress.length > 0 ? (
              <Chip
                label={`${inProgress.length} en curso`}
                selected={filter === 'inProgress'}
                onPress={() => setFilter((current) => current === 'inProgress' ? null : 'inProgress')}
              />
            ) : null}
            {notStarted.length > 0 ? (
              <Chip
                label={`${notStarted.length} por empezar`}
                selected={filter === 'notStarted'}
                onPress={() => setFilter((current) => current === 'notStarted' ? null : 'notStarted')}
              />
            ) : null}
          </View>
        )}
        <View style={styles.missionList}>
          {shown.map((mission) => (
            <MissionCard key={mission.id} mission={mission} onPress={() => onMissionPress(mission.id)} />
          ))}
          {missions.length > 0 && shown.length === 0 ? (
            <AppText variant="body" color="textMuted">No hay misiones en este filtro.</AppText>
          ) : null}
        </View>

        {completed.length > 0 ? (
          <View style={styles.missionList}>
            <AppText variant="title">Misiones completadas</AppText>
            {completed.map((mission) => (
              <MissionCard key={mission.id} mission={mission} done onPress={() => onMissionPress(mission.id)} />
            ))}
          </View>
        ) : null}

        {onAchievementsPress ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Ver salón de logros"
            onPress={onAchievementsPress}
            style={styles.hallButton}
          >
            <Icon name="emoji-events" size={22} color={colors.textOnPrimary} />
            <AppText variant="body" bold color="textOnPrimary">Ver salón de logros</AppText>
          </TouchableOpacity>
        ) : null}
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  missionList: { gap: spacing.md, marginBottom: spacing.lg },
  missionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  missionTitle: { flex: 1 },
  missionCard: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: radius.lg,
  },
  missionCardDone: { borderLeftColor: colors.accent, backgroundColor: colors.background },
  hallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  rewardPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
});
