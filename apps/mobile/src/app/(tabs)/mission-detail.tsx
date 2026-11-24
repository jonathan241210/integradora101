import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MissionDetailScreen } from '../../screens/MissionDetailScreen';
import { VisitorDataGate } from '../../components/ui';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function MissionDetailRoute() {
  const router = useRouter();
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const { missions, loading, error, status, refresh } = useUserViewModel();
  const progress = useVisitorProgress();
  const source = progress.snapshot?.missions ?? missions;
  const mission = source.find((item) => item.id === id) ?? null;

  return (
    <VisitorDataGate
      title="Misión"
      status={status === 'loading' ? 'ready' : status}
      error={error}
      onLogin={() => router.replace('/login')}
      onRetry={refresh}
    >
      <MissionDetailScreen mission={mission} loading={loading} error={error} onBackPress={() => {
        if (returnTo === 'home') {
          router.replace({ pathname: '/', params: { panel: 'missions' } });
          return;
        }
        router.replace('/game');
      }} />
    </VisitorDataGate>
  );
}
