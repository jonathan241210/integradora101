import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Achievement } from '../models';
import { AppText, BackButton, Card, Icon, ScreenContainer } from '../components/ui';
import { colors, spacing } from '../theme/tokens';

interface AchievementDetailScreenProps {
  achievement: Achievement | null;
  loading?: boolean;
  error?: string | null;
  onBackPress: () => void;
}

export function AchievementDetailScreen({
  achievement,
  loading = false,
  error,
  onBackPress,
}: AchievementDetailScreenProps) {
  if (loading) {
    return <ScreenContainer><View style={styles.message}><AppText variant="body">Cargando logro…</AppText></View></ScreenContainer>;
  }
  if (error || !achievement) {
    return (
      <ScreenContainer>
        <View style={styles.message}>
          <AppText variant="body">{error ?? 'No se encontró el logro.'}</AppText>
          <View style={styles.backButton}>
            <BackButton onPress={onBackPress} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <View style={styles.backButton}>
          <BackButton onPress={onBackPress} />
        </View>
        <View style={[styles.iconBadge, !achievement.unlocked && styles.lockedBadge]}>
          <Icon name={achievement.unlocked ? achievement.icon : 'lock'} size={48} color={achievement.unlocked ? colors.primary : colors.textMuted} />
        </View>
        <AppText variant="title" center>{achievement.title}</AppText>
        <AppText variant="body" color="textMuted" center>{achievement.description}</AppText>
        <Card style={styles.details}>
          <AppText variant="subheading" bold>Recompensa</AppText>
          <AppText variant="body">{achievement.unlocked ? `${achievement.points} puntos obtenidos` : `${achievement.points} puntos al obtenerlo`}</AppText>
          <AppText variant="subheading" bold style={styles.sectionTitle}>
            {achievement.unlocked ? 'Cómo lo desbloqueaste' : 'Cómo desbloquearlo'}
          </AppText>
          <AppText variant="body" color="textMuted">
            {achievement.unlocked ? achievement.action : achievement.requirement}
          </AppText>
          {achievement.unlocked && achievement.earnedAt && (
            <>
              <AppText variant="subheading" bold style={styles.sectionTitle}>Fecha de obtención</AppText>
              <AppText variant="body" color="textMuted">
                {new Date(achievement.earnedAt).toLocaleDateString('es-MX')}
              </AppText>
            </>
          )}
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  backButton: { alignSelf: 'stretch', alignItems: 'flex-start' },
  message: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  iconBadge: { width: 104, height: 104, borderRadius: 52, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { backgroundColor: colors.border },
  details: { width: '100%', gap: spacing.sm },
  sectionTitle: { marginTop: spacing.sm },
});
