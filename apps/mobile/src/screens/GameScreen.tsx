import React from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { ScreenContainer, AppText, BackButton, HeroBanner, SectionHeader, Card, Icon } from '../components/ui';
import { colors, radius, spacing } from '../theme/tokens';
import { Achievement, Mission } from '../models';

interface GameScreenProps {
  missions: Mission[];
  achievements: Achievement[];
  pendingScans?: { clientScanId: string; code: string }[];
  onBackPress: () => void;
  onMissionPress: (id: string) => void;
  onAchievementPress: (id: string) => void;
  onSeeAchievementsPress?: () => void;
  onRetryPress?: () => void;
}

export function GameScreen({ missions, achievements, pendingScans = [], onBackPress, onMissionPress, onAchievementPress, onSeeAchievementsPress, onRetryPress }: GameScreenProps) {
  return (
    <ScreenContainer>
      <View style={styles.header}>
        <BackButton onPress={onBackPress} />
        <HeroBanner 
          overline="Minijuego en vivo" 
          title="Aventura en el Zoo" 
          subtitle="Completa misiones y acumula puntos de exploración." 
        />
      </View>

      <View style={styles.content}>
        {pendingScans.length > 0 ? (
          <View style={styles.missionList}>
            <AppText variant="heading">Escaneos pendientes</AppText>
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
        <AppText variant="heading">Misiones Activas</AppText>
        <View style={styles.missionList}>
          {missions.map(m => (
            <TouchableOpacity
              key={m.id}
              onPress={() => onMissionPress(m.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver detalles de la misión ${m.title}`}
            >
              <Card style={styles.missionCard}>
                <AppText variant="subheading" bold>{m.title}</AppText>
                <AppText variant="small">Progreso: {m.progress}/{m.total} - Premio: {m.reward}</AppText>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        <SectionHeader title="Logros destacados" actionLabel="Ver todos" onActionPress={onSeeAchievementsPress} />
        <ScrollView
          horizontal
          testID="achievements-carousel"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rewardList}
        >
          {achievements.filter((achievement) => achievement.unlocked).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onAchievementPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver logro ${item.title}`}
              style={styles.achievementButton}
            >
              <View style={styles.rewardBadge}>
                <Icon name={item.icon} size={28} color={colors.primary} />
              </View>
              <AppText variant="caption" bold center style={styles.achievementName}>{item.title}</AppText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, alignItems: 'flex-start' },
  content: { padding: spacing.lg, gap: spacing.lg },
  missionList: { gap: spacing.md, marginBottom: spacing.lg },
  missionCard: { padding: spacing.md, gap: spacing.xs },
  rewardList: { gap: spacing.md, paddingVertical: spacing.md },
  achievementButton: { width: 88, alignItems: 'center', gap: spacing.xs },
  rewardBadge: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', padding: spacing.sm },
  achievementName: { width: '100%', minHeight: 32 },
});
