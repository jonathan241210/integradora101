import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer, AppText, Card, Button, Icon } from '../components/ui';
import { colors, spacing, radius } from '../theme/tokens';
import { Achievement, Milestone, User } from '../models';

interface ProfileScreenProps {
  user: User;
  achievements: Achievement[];
  milestones: Milestone[];
  onAchievementPress: (id: string) => void;
  onSeeAllAchievementsPress: () => void;
}

export function ProfileScreen({ user, achievements, milestones, onAchievementPress, onSeeAllAchievementsPress }: ProfileScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarPlaceholder} />
          <AppText variant="title" center>{user.name}</AppText>
          <AppText variant="small" center color="primary">{user.rank}</AppText>
          
          <View style={styles.statsRow}>
            <StatItem label="Descubiertos" value={`${user.discoveredCount}/${user.totalAnimals}`} />
            <StatItem label="Puntos" value={user.points.toString()} />
            <StatItem label="Nivel" value={user.level.toString()} />
          </View>
        </Card>

        <View style={styles.achievementHeader}>
          <AppText variant="heading">Logros Recientes</AppText>
          <Button label="Ver todos" variant="outline" onPress={onSeeAllAchievementsPress} />
        </View>
        <View style={styles.achievementsList}>
          {achievements.filter((achievement) => achievement.unlocked).slice(0, 3).map((achievement) => (
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
        </View>

        <AppText variant="heading" style={{ marginTop: spacing.lg }}>Historial de Hitos</AppText>
        <View style={styles.milestoneList}>
          {milestones.map((milestone) => (
            <View key={milestone.id} style={styles.milestoneItem}>
              <View style={styles.dot} />
              <View style={styles.milestoneContent}>
                <AppText variant="small" bold>{milestone.title}</AppText>
                <AppText variant="caption" color="textMuted">{milestone.date}</AppText>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScreenContainer>
  );
}

function StatItem({ label, value }: { label: string, value: string }) {
  return (
    <View style={styles.statItem}>
      <AppText variant="caption" color="textMuted" center>{label}</AppText>
      <AppText variant="subheading" bold center>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  profileCard: { padding: spacing.lg, alignItems: 'center', gap: spacing.md },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: radius.pill, backgroundColor: colors.border },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, marginTop: spacing.md, width: '100%' },
  statItem: { flex: 1, alignItems: 'center', gap: spacing.xs },
  achievementsList: { gap: spacing.sm, marginTop: spacing.sm },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  achievementCard: { padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  achievementName: { flex: 1 },
  milestoneList: { gap: spacing.md, marginTop: spacing.sm },
  milestoneItem: { flexDirection: 'row', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: radius.pill, backgroundColor: colors.primary, marginTop: 4 },
  milestoneContent: { gap: 2 },
});
