import React from 'react';
import { View, StyleSheet, TouchableOpacity, Pressable, ScrollView, Image } from 'react-native';
import { ScreenContainer, AppText, Card, Icon, ProgressBar } from '../components/ui';
import { AVATAR_IMAGES, avatarLabel, isAvatarCode } from '../constants/avatarCatalog';
import { colors, spacing, radius } from '../theme/tokens';
import { Achievement, User } from '../models';

interface ProfileScreenProps {
  user: User;
  displayName?: string;
  avatarCode?: string | null;
  placeholder?: boolean;
  nextThreshold?: number | null;
  achievements: Achievement[];
  onAchievementPress: (id: string) => void;
  onSeeAllAchievementsPress: () => void;
  onMemoriesPress: () => void;
  onSettingsPress: () => void;
}

const RECENT_LIMIT = 5;

export function ProfileScreen({ user, displayName, avatarCode, placeholder = false, nextThreshold, achievements, onAchievementPress, onSeeAllAchievementsPress, onMemoriesPress, onSettingsPress }: ProfileScreenProps) {
  const knownAvatar = avatarCode && isAvatarCode(avatarCode) ? avatarCode : null;
  const shownAvatar = knownAvatar ? avatarLabel(knownAvatar) : null;
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
            <View style={styles.avatarPlaceholder} accessibilityLabel={shownAvatar ? `Avatar ${shownAvatar}` : 'Avatar'}>
              {knownAvatar ? <Image source={AVATAR_IMAGES[knownAvatar]} accessible={false} style={styles.avatarImage} /> : null}
            </View>
            <View style={styles.identityText}>
              <AppText variant="title">{placeholder ? (displayName ?? '—') : (displayName ?? user.name)}</AppText>
              <View style={styles.rankPill}>
                <AppText variant="small" bold>{placeholder ? '—' : user.rank}</AppText>
              </View>
            </View>
          </View>

          <View style={styles.statsStrip}>
            <StatItem label="Descubiertos" value={placeholder ? '—' : `${user.discoveredCount}/${user.totalAnimals}`} />
            <StatItem label="Puntos" value={placeholder ? '—' : user.points.toString()} />
            <StatItem label="Nivel" value={placeholder ? '—' : user.level.toString()} />
          </View>

          {!placeholder && nextThreshold != null && nextThreshold > 0 ? (
            <ProgressBar
              value={user.points / nextThreshold}
              label={`Siguiente umbral: ${nextThreshold} puntos`}
              labelColor="textMuted"
              fill="wine"
            />
          ) : null}
        </Card>

        <Pressable
          onPress={onMemoriesPress}
          accessibilityRole="button"
          accessibilityLabel="Mis momentos"
        >
          <Card style={styles.memoriesCard}>
            <Icon name="images" size={22} color={colors.primary} />
            <AppText variant="subheading" bold style={styles.memoriesLabel}>Mis momentos</AppText>
            <Icon name="chevron-forward" size={20} color={colors.textMuted} />
          </Card>
        </Pressable>

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
    overflow: 'hidden',
  },
  avatarImage: { width: 72, height: 72 },
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
  memoriesCard: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  memoriesLabel: { flex: 1 },
  achievementCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  achievementName: { flex: 1 },
});
