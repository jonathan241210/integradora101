import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AchievementDetailScreen } from '../../screens/AchievementDetailScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function AchievementDetailRoute() {
  const router = useRouter();
  const { id, source: routeSource, returnTo } = useLocalSearchParams<{
    id: string;
    source?: string;
    returnTo?: string;
  }>();
  const source = routeSource === 'profile' ? 'profile' : 'game';
  const { achievements, loading, error } = useUserViewModel();
  const progress = useVisitorProgress();
  const achievement = (progress.snapshot?.achievements ?? achievements).find((item) => item.id === id) ?? null;

  return (
    <AchievementDetailScreen
      achievement={achievement}
      loading={loading}
      error={error}
      onBackPress={() => {
        if (returnTo === 'achievements') {
          router.replace({ pathname: '/achievements', params: { source } });
        } else {
          router.replace(source === 'profile' ? '/profile' : '/game');
        }
      }}
    />
  );
}
