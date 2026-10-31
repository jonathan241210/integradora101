import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AchievementsScreen } from '../../screens/AchievementsScreen';
import { LoadingView, ScreenContainer } from '../../components/ui';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function AchievementsRoute() {
  const router = useRouter();
  const { source: routeSource } = useLocalSearchParams<{ source?: string }>();
  const source = routeSource === 'profile' ? 'profile' : 'game';
  const { achievements, loading } = useUserViewModel();
  const progress = useVisitorProgress();
  if (progress.loading && !progress.snapshot) {
    return (
      <ScreenContainer>
        <LoadingView message="Cargando logros…" />
      </ScreenContainer>
    );
  }
  return (
    <AchievementsScreen
      achievements={progress.snapshot?.achievements ?? achievements}
      loading={loading}
      source={source}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source, returnTo: 'achievements' },
      })}
      onBackPress={() => router.replace(source === 'profile' ? '/profile' : '/game')}
    />
  );
}
