import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { GameScreen } from '../../screens/GameScreen';
import { scanQueue, type QueuedScan } from '../../services/scanQueue';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function GameRoute() {
  const router = useRouter();
  const { missions } = useUserViewModel();
  const progress = useVisitorProgress();
  const [pending, setPending] = useState<QueuedScan[]>([]);

  const reload = useCallback(async () => {
    setPending(await scanQueue.list());
  }, []);

  useEffect(() => {
    void reload();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void scanQueue.flush().finally(reload);
      }
    });
    return () => subscription.remove();
  }, [reload]);

  const missionSource = progress.snapshot?.missions ?? missions;
  const pendingMissions = missionSource.filter((mission) => mission.progress < mission.total);

  return (
    <GameScreen
      missions={pendingMissions.length > 0 ? pendingMissions : missionSource}
      loading={progress.loading && !progress.snapshot}
      pendingScans={pending}
      onBackPress={() => goBackWithinTabs(router)}
      onMissionPress={(id) => router.push({ pathname: '/mission-detail', params: { id } })}
      onRetryPress={() => {
        void scanQueue.retry().finally(reload);
      }}
    />
  );
}
