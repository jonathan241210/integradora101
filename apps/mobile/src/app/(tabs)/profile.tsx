import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, ScreenContainer } from '../../components/ui';
import { avatarLabel } from '../../constants/avatarCatalog';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { accountSession } from '../../session/accountSession';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, achievements, milestones, loading, error } = useUserViewModel();
  const [identity, setIdentity] = useState<{ nickname: string; avatarLabel: string } | null>(null);

  useEffect(() => {
    let active = true;
    const load = () => {
      void accountSession.getProfile().then((profile) => {
        if (!active) return;
        setIdentity(profile
          ? { nickname: profile.nickname, avatarLabel: avatarLabel(profile.avatarCode) }
          : null);
      });
    };
    load();
    const unsubscribe = accountSession.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);
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
      displayName={identity?.nickname}
      avatarLabel={identity?.avatarLabel}
      achievements={achievements}
      milestones={milestones}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source: 'profile', returnTo: 'profile' },
      })}
      onSeeAllAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'profile' } })}
      onSettingsPress={() => router.push('/settings')}
    />
  );
}
