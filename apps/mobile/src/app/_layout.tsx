import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { nextGateRoute } from '../viewmodels/authForm';
import { useSessionViewModel } from '../viewmodels/useAccessViewModels';

export default function RootLayout() {
  const { status } = useSessionViewModel();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const target = nextGateRoute(status, segments[0] === '(auth)');
    if (target) router.replace(target);
  }, [router, segments, status]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="animal/[id]" />
    </Stack>
  );
}
