import { useRouter } from 'expo-router';
import { AppText, ScreenContainer, TitledLoading } from '../../components/ui';
import { avatarLabel } from '../../constants/avatarCatalog';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { useVisitorProgress, profileDiscoveryCounts } from '../../viewmodels/useVisitorProgress';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, achievements, loading, error } = useUserViewModel();
  const progress = useVisitorProgress();
  const { profile } = useVisitorProfile();
  const identity = profile
    ? { nickname: profile.nickname, avatarLabel: avatarLabel(profile.avatarCode) }
    : null;
  if (loading || (progress.loading && !progress.snapshot)) {
    return (
      <ScreenContainer scroll={false}>
        <TitledLoading title="Perfil" message="Cargando perfil…" />
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
  const live = progress.snapshot;
  const species = profileDiscoveryCounts(live);
  const shownUser = live
    ? {
        ...user,
        points: live.progress.points,
        level: live.progress.level,
        rank: live.progress.rank,
        discoveredCount: species?.discovered ?? live.progress.discoveredSpecies,
        totalAnimals: species?.total ?? live.progress.totalSpecies,
      }
    : user;
  return (
    <ProfileScreen
      user={shownUser}
      displayName={identity?.nickname}
      avatarLabel={identity?.avatarLabel}
      nextThreshold={live?.progress.nextThreshold}
      achievements={live?.achievements ?? achievements}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source: 'profile', returnTo: 'profile' },
      })}
      onSeeAllAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'profile' } })}
      onSettingsPress={() => router.push('/settings')}
    />
  );
}
