import { useRouter } from 'expo-router';
import { GameScreen } from '../../screens/GameScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function GameRoute() {
  const router = useRouter();
  const { missions, achievements, leaderboard } = useUserViewModel();
  return (
    <GameScreen
      missions={missions}
      achievements={achievements}
      leaderboard={leaderboard}
      onBackPress={() => router.back()}
      onMissionPress={(id) => router.push({ pathname: '/mission-detail', params: { id } })}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source: 'game', returnTo: 'game' },
      })}
      onSeeAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'game' } })}
    />
  );
}
