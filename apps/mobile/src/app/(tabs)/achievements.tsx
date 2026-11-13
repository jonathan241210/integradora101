import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AchievementsScreen } from '../../screens/AchievementsScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function AchievementsRoute() {
  const router = useRouter();
  const { source: routeSource, returnTo } = useLocalSearchParams<{ source?: string; returnTo?: string }>();
  const source = routeSource === 'profile' ? 'profile' : 'game';
  const { achievements, loading } = useUserViewModel();
  const progress = useVisitorProgress();
  return (
    <AchievementsScreen
      achievements={progress.snapshot?.achievements ?? achievements}
      loading={loading || (progress.loading && !progress.snapshot)}
      source={source}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source, returnTo: 'achievements' },
      })}
      onBackPress={() => {
        if (returnTo === 'home') {
          router.replace({ pathname: '/', params: { panel: 'missions' } });
          return;
        }
        router.replace(source === 'profile' ? '/profile' : '/game');
      }}
    />
  );
}
