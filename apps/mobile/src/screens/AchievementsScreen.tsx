import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Achievement } from '../models';
import { AppText, BackButton, Card, Chip, Icon, LoadingView, ScreenContainer } from '../components/ui';
import { colors, spacing } from '../theme/tokens';

type AchievementFilter = 'unlocked' | 'locked';
type AchievementSort = 'name-asc' | 'name-desc' | 'newest' | 'oldest';

interface AchievementsScreenProps {
  achievements: Achievement[];
  loading?: boolean;
  source: 'game' | 'profile';
  onAchievementPress: (id: string) => void;
  onBackPress: () => void;
}

const SORT_LABEL: Record<AchievementSort, string> = {
  newest: 'Más recientes',
  oldest: 'Más antiguos',
  'name-asc': 'Nombre A–Z',
  'name-desc': 'Nombre Z–A',
};

function sortChoices(filter: AchievementFilter): AchievementSort[] {
  return filter === 'unlocked'
    ? ['newest', 'oldest', 'name-asc', 'name-desc']
    : ['name-asc', 'name-desc'];
}

export function AchievementsScreen({ achievements, loading = false, source, onAchievementPress, onBackPress }: AchievementsScreenProps) {
  const [filter, setFilter] = useState<AchievementFilter>('unlocked');
  const [sort, setSort] = useState<AchievementSort>('newest');
  const [filterTouched, setFilterTouched] = useState(false);
  const hasUnlocked = achievements.some((achievement) => achievement.unlocked);
  const activeFilter: AchievementFilter = filterTouched ? filter : (hasUnlocked ? 'unlocked' : 'locked');
  const choices = sortChoices(activeFilter);
  const activeSort = choices.includes(sort) ? sort : choices[0];
  const filteredAchievements = useMemo(() => {
    const filtered = achievements.filter((achievement) => achievement.unlocked === (activeFilter === 'unlocked'));
    return [...filtered].sort((a, b) => {
      if (activeSort === 'name-asc') return a.title.localeCompare(b.title, 'es');
      if (activeSort === 'name-desc') return b.title.localeCompare(a.title, 'es');
      const aDate = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
      const bDate = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
      return activeSort === 'newest' ? bDate - aDate : aDate - bDate;
    });
  }, [achievements, activeFilter, activeSort]);

  const selectFilter = (nextFilter: AchievementFilter) => {
    setFilterTouched(true);
    setFilter(nextFilter);
    setSort(nextFilter === 'unlocked' ? 'newest' : 'name-asc');
  };

  return (
    <ScreenContainer scroll={false}>
      <View style={styles.container}>
        <BackButton
          onPress={onBackPress}
          accessibilityLabel={source === 'profile' ? 'Volver al perfil' : 'Volver a Aventura en el Zoo'}
        />
        <AppText variant="title">Todos los logros</AppText>
        {loading ? (
          <View style={styles.loadingFill}>
            <LoadingView message="Cargando logros…" />
          </View>
        ) : (
        <>
        <View style={styles.filterRow}>
          <Chip label="Obtenidos" selected={activeFilter === 'unlocked'} onPress={() => selectFilter('unlocked')} />
          <Chip label="Por obtener" selected={activeFilter === 'locked'} onPress={() => selectFilter('locked')} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ordenar"
          onPress={() => {
            const index = choices.indexOf(activeSort);
            setSort(choices[(index + 1) % choices.length]);
          }}
          style={styles.sortToggle}
        >
          <AppText variant="body" bold style={styles.sortToggleText}>{`Ordenar: ${SORT_LABEL[activeSort]}`}</AppText>
        </Pressable>
        <FlatList
          testID="achievements-list"
          data={filteredAchievements}
          keyExtractor={(achievement) => achievement.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={(
            <AppText variant="body" color="textMuted" center>
              No hay logros en esta categoría todavía.
            </AppText>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => onAchievementPress(item.id)}
              accessibilityRole="button"
              accessibilityLabel={`Ver logro ${item.title}`}
            >
              <Card style={styles.achievementCard}>
                <View style={[styles.iconBadge, !item.unlocked && styles.lockedBadge]}>
                  <Icon name={item.unlocked ? item.icon : 'lock'} size={28} color={item.unlocked ? colors.primary : colors.textMuted} />
                </View>
                <View style={styles.achievementInfo}>
                  <AppText variant="subheading" bold>{item.title}</AppText>
                  <AppText variant="small" color="textMuted">
                    {item.unlocked ? `${item.points} puntos · ${item.earnedAt ? new Date(item.earnedAt).toLocaleDateString('es-MX') : 'Obtenido'}` : item.requirement}
                  </AppText>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
        </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  loadingFill: { flex: 1, justifyContent: 'center' },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  sortToggle: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  sortToggleText: { color: colors.primary },
  list: { paddingVertical: spacing.sm },
  separator: { height: spacing.sm },
  achievementCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { backgroundColor: colors.border },
  achievementInfo: { flex: 1, gap: spacing.xs },
});
