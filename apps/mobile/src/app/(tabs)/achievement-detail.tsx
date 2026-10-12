import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AchievementDetailScreen } from '../../screens/AchievementDetailScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function AchievementDetailRoute() {
  const router = useRouter();
  const { id, source: routeSource, returnTo } = useLocalSearchParams<{
    id: string;
    source?: string;
    returnTo?: string;
  }>();
  const source = routeSource === 'profile' ? 'profile' : 'game';
  const { achievements, loading, error } = useUserViewModel();
  const achievement = achievements.find((item) => item.id === id) ?? null;

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
