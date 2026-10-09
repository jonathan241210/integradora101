import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AchievementsScreen } from '../../screens/AchievementsScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function AchievementsRoute() {
  const router = useRouter();
  const { source: routeSource } = useLocalSearchParams<{ source?: string }>();
  const source = routeSource === 'profile' ? 'profile' : 'game';
  const { achievements, loading } = useUserViewModel();
  return (
    <AchievementsScreen
      achievements={achievements}
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
