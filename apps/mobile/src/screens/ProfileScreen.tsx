import React from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, ScrollView } from 'react-native';
import { ScreenContainer, AppText, Card, Icon, ProgressBar } from '../components/ui';
import { colors, spacing, radius } from '../theme/tokens';
import { Achievement, User } from '../models';

interface ProfileScreenProps {
  user: User;
  displayName?: string;
  avatarLabel?: string;
  nextThreshold?: number | null;
  achievements: Achievement[];
  onAchievementPress: (id: string) => void;
  onSeeAllAchievementsPress: () => void;
  onSettingsPress: () => void;
}

const RECENT_LIMIT = 5;

export function ProfileScreen({ user, displayName, avatarLabel, nextThreshold, achievements, onAchievementPress, onSeeAllAchievementsPress, onSettingsPress }: ProfileScreenProps) {
  const recent = achievements
    .filter((achievement) => achievement.unlocked)
    .sort((left, right) => {
      const leftDate = left.earnedAt ? new Date(left.earnedAt).getTime() : 0;
      const rightDate = right.earnedAt ? new Date(right.earnedAt).getTime() : 0;
      return rightDate - leftDate;
    })
    .slice(0, RECENT_LIMIT);

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.header}>
          <AppText variant="title">Perfil</AppText>
          <Pressable
            onPress={onSettingsPress}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            style={styles.settingsButton}
          >
            <Icon name="settings" size={22} color={colors.primary} />
          </Pressable>
        </View>
        <Card style={styles.profileCard}>
          <View style={styles.identity}>
            <View style={styles.avatarPlaceholder} accessibilityLabel={avatarLabel ? `Avatar ${avatarLabel}` : 'Avatar'}>
              {avatarLabel ? <AppText variant="small" center bold>{avatarLabel}</AppText> : null}
            </View>
            <View style={styles.identityText}>
              <AppText variant="title">{displayName ?? user.name}</AppText>
              <View style={styles.rankPill}>
                <AppText variant="small" bold>{user.rank}</AppText>
              </View>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <StatItem label="Descubiertos" value={`${user.discoveredCount}/${user.totalAnimals}`} />
            <StatItem label="Puntos" value={user.points.toString()} />
            <StatItem label="Nivel" value={user.level.toString()} />
          </View>

          {nextThreshold != null && nextThreshold > 0 ? (
            <ProgressBar
              value={user.points / nextThreshold}
              label={`Siguiente umbral: ${nextThreshold} puntos`}
              labelColor="textMuted"
              fill="wine"
            />
          ) : null}
        </Card>

        <View style={styles.achievementHeader}>
          <AppText variant="title">Logros Recientes</AppText>
          <Pressable accessibilityRole="button" accessibilityLabel="Ver todos" onPress={onSeeAllAchievementsPress} style={styles.seeAll}>
            <AppText variant="body" bold style={styles.seeAllText}>Ver todos</AppText>
          </Pressable>
        </View>
        <View style={styles.achievementsList}>
          {recent.length === 0 ? (
            <AppText variant="body" color="textMuted">Aún no tienes logros</AppText>
          ) : (
            <ScrollView testID="recent-achievements" style={styles.recentScroll} nestedScrollEnabled showsVerticalScrollIndicator>
              {recent.map((achievement) => (
                <TouchableOpacity
                  key={achievement.id}
                  onPress={() => onAchievementPress(achievement.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver logro ${achievement.title}`}
                >
                  <Card style={styles.achievementCard}>
                    <Icon name={achievement.icon} size={24} color={colors.primary} />
                    <AppText variant="subheading" style={styles.achievementName}>{achievement.title}</AppText>
                    <AppText variant="small" color="textMuted">{achievement.points} puntos</AppText>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.statItem}>
      <AppText variant="caption" color="textMuted" center>{label}</AppText>
      <AppText variant="title" bold center>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    padding: spacing.lg,
    alignItems: 'stretch',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  identityText: { flex: 1, gap: spacing.xs },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  rankPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statsStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  seeAll: { minHeight: 44, justifyContent: 'center' },
  seeAllText: { color: colors.secondary },
  statItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  achievementsList: { marginTop: spacing.sm },
  recentScroll: { maxHeight: 232 },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  achievementCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  achievementName: { flex: 1 },
});
