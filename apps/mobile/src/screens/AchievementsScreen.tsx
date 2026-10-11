import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Achievement } from '../models';
import { AppText, BackButton, Card, Chip, Icon, ScreenContainer } from '../components/ui';
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

const sortOptions: { key: AchievementSort; label: string; earnedOnly?: boolean }[] = [
  { key: 'newest', label: 'Más recientes', earnedOnly: true },
  { key: 'oldest', label: 'Más antiguos', earnedOnly: true },
  { key: 'name-asc', label: 'Nombre A–Z' },
  { key: 'name-desc', label: 'Nombre Z–A' },
];

export function AchievementsScreen({ achievements, loading = false, source, onAchievementPress, onBackPress }: AchievementsScreenProps) {
  const [filter, setFilter] = useState<AchievementFilter>('unlocked');
  const [sort, setSort] = useState<AchievementSort>('newest');
  const filteredAchievements = useMemo(() => {
    const filtered = achievements.filter((achievement) => achievement.unlocked === (filter === 'unlocked'));
    return [...filtered].sort((a, b) => {
      if (sort === 'name-asc') return a.title.localeCompare(b.title, 'es');
      if (sort === 'name-desc') return b.title.localeCompare(a.title, 'es');
      const aDate = a.earnedAt ? new Date(a.earnedAt).getTime() : 0;
      const bDate = b.earnedAt ? new Date(b.earnedAt).getTime() : 0;
      return sort === 'newest' ? bDate - aDate : aDate - bDate;
    });
  }, [achievements, filter, sort]);

  const selectFilter = (nextFilter: AchievementFilter) => {
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
        <View style={styles.filterRow}>
          <Chip label="Obtenidos" selected={filter === 'unlocked'} onPress={() => selectFilter('unlocked')} />
          <Chip label="Por obtener" selected={filter === 'locked'} onPress={() => selectFilter('locked')} />
        </View>
        <AppText variant="small" color="textMuted">Ordenar por</AppText>
        <View style={styles.sortRow}>
          {sortOptions
            .filter((option) => !option.earnedOnly || filter === 'unlocked')
            .map((option) => (
              <Chip
                key={option.key}
                label={option.label}
                selected={sort === option.key}
                onPress={() => setSort(option.key)}
              />
            ))}
        </View>
        {loading && <AppText variant="body" color="textMuted">Cargando logros…</AppText>}
        <FlatList
          testID="achievements-list"
          data={filteredAchievements}
          keyExtractor={(achievement) => achievement.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={!loading ? (
            <AppText variant="body" color="textMuted" center>
              No hay logros en esta categoría todavía.
            </AppText>
          ) : null}
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
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  list: { paddingVertical: spacing.sm },
  separator: { height: spacing.sm },
  achievementCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  lockedBadge: { backgroundColor: colors.border },
  achievementInfo: { flex: 1, gap: spacing.xs },
});
