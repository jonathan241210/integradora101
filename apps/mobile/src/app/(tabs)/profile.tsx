import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AppText, ScreenContainer, TitledLoading } from '../../components/ui';
import { Animal } from '../../models';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { useAnimalViewModel } from '../../viewmodels/useAnimalViewModel';
import { useUserViewModel } from '../../viewmodels/useUserViewModel';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';
import { mergeDiscoveredSpecies, profileDiscoveryCounts, useVisitorProgress } from '../../viewmodels/useVisitorProgress';

export default function ProfileRoute() {
  const router = useRouter();
  const { user, achievements, loading, error } = useUserViewModel();
  const { getAnimals } = useAnimalViewModel();
  const progress = useVisitorProgress();
  const { profile } = useVisitorProfile();
  const [catalog, setCatalog] = useState<Animal[] | null>(null);

  useEffect(() => {
    let active = true;
    getAnimals()
      .then((rows) => {
        if (active) setCatalog(rows);
      })
      .catch(() => {
        if (active) setCatalog([]);
      });
    return () => {
      active = false;
    };
  }, [getAnimals]);
  const identity = profile
    ? { nickname: profile.nickname, avatarCode: profile.avatarCode }
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
  const shownCatalog = catalog ? mergeDiscoveredSpecies(catalog, live) : null;
  const shownUser = live
    ? {
        ...user,
        points: live.progress.points,
        level: live.progress.level,
        rank: live.progress.rank,
        discoveredCount: shownCatalog
          ? shownCatalog.filter((animal) => animal.isDiscovered).length
          : (species?.discovered ?? live.progress.discoveredSpecies),
        totalAnimals: shownCatalog
          ? shownCatalog.length
          : (species?.total ?? live.progress.totalSpecies),
      }
    : user;
  return (
    <ProfileScreen
      user={shownUser}
      displayName={identity?.nickname}
      avatarCode={identity?.avatarCode}
      placeholder={!live}
      nextThreshold={live?.progress.nextThreshold}
      achievements={live?.achievements ?? []}
      onAchievementPress={(id) => router.push({
        pathname: '/achievement-detail',
        params: { id, source: 'profile', returnTo: 'profile' },
      })}
      onSeeAllAchievementsPress={() => router.push({ pathname: '/achievements', params: { source: 'profile' } })}
      onMemoriesPress={() => router.push('/memories')}
      onSettingsPress={() => router.push('/settings')}
    />
  );
}
