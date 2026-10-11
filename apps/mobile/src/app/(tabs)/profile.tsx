import { AppText, ScreenContainer } from '../../components/ui';
import { useRouter } from 'expo-router';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, achievements, milestones, loading, error } = useUserViewModel();
  if (loading) {
    return (
      <ScreenContainer>
        <AppText variant="body">Cargando perfil…</AppText>
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer>
        <AppText variant="body" color="danger">No se pudo cargar el perfil: {error}</AppText>
      </ScreenContainer>
    );
  }
  if (!user) {
    return (
      <ScreenContainer>
        <AppText variant="body" color="danger">No hay información del perfil disponible.</AppText>
      </ScreenContainer>
    );
  }
  return (
    <ProfileScreen
      user={user}
      achievements={achievements}
      milestones={milestones}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source: 'profile', returnTo: 'profile' },
      })}
      onSeeAllAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'profile' } })}
    />
  );
}
