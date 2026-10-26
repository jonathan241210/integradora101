import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MissionDetailScreen } from '../../screens/MissionDetailScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function MissionDetailRoute() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { missions, loading, error } = useUserViewModel();
  const progress = useVisitorProgress();
  const source = progress.snapshot?.missions ?? missions;
  const mission = source.find((item) => item.id === id) ?? null;

  return <MissionDetailScreen mission={mission} loading={loading} error={error} onBackPress={() => router.replace('/game')} />;
}
