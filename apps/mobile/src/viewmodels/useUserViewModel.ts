import { useState, useEffect, useCallback } from 'react';
import { UserRepository, UserRepositoryImpl } from '../repositories';
import { Achievement, Milestone, User, Mission, Reward, LeaderboardEntry } from '../models';

const defaultRepository = new UserRepositoryImpl();

export function useUserViewModel(repository: UserRepository = defaultRepository) {
  const [user, setUser] = useState<User | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userData, missionsData, rewardsData, leaderboardData, achievementData, milestoneData] = await Promise.all([
        repository.getUser(),
        repository.getMissions(),
        repository.getRewards(),
        repository.getLeaderboard(),
        repository.getAchievements(),
        repository.getMilestones(),
      ]);
      setUser(userData);
      setMissions(missionsData);
      setRewards(rewardsData);
      setLeaderboard(leaderboardData);
      setAchievements(achievementData);
      setMilestones(milestoneData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError(error instanceof Error ? error.message : 'No se pudieron cargar los datos del perfil.');
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  return {
    user,
    missions,
    rewards,
    leaderboard,
    achievements,
    milestones,
    loading,
    error,
    refresh: loadUserData,
  };
}
