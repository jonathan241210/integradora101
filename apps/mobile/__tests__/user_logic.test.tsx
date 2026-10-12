import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { useUserViewModel } from '../src/viewmodels/useUserViewModel';
import { UserRepositoryImpl } from '../src/repositories/userRepository';

const TestUserComponent = ({ repo }: { repo: UserRepositoryImpl }) => {
  const { user, missions, leaderboard, loading, refresh } = useUserViewModel(repo);

  return (
    <>
      <Text testID="loading-status">{loading ? 'loading' : 'idle'}</Text>
      <Text testID="user-name">{user?.name || 'no-user'}</Text>
      <Text testID="user-points">{user?.points || 0}</Text>
      <Text testID="missions-count">{missions.length}</Text>
      <Text testID="leader-top">{leaderboard[0]?.name || 'no-leader'}</Text>
      <Text testID="leader-current">{leaderboard.find(l => l.isCurrentUser)?.name || 'no-current'}</Text>
      <TouchableOpacity testID="refresh-button" onPress={refresh}>
        <Text>Refresh</Text>
      </TouchableOpacity>
    </>
  );
};

describe('User Domain Logic (T-20 / CA-08)', () => {
  const repo = new UserRepositoryImpl();

  it('should load user data correctly', async () => {
    await render(<TestUserComponent repo={repo} />);
    
    await waitFor(() => expect(screen.getByTestId('loading-status').props.children).toBe('idle'));

    expect(screen.getByTestId('user-name').props.children).toBe('María García');
    expect(screen.getByTestId('user-points').props.children).toBe(2450);
    expect(parseInt(screen.getByTestId('missions-count').props.children)).toBeGreaterThan(0);
  });

  it('should return correct leaderboard data and handle refresh', async () => {
    await render(<TestUserComponent repo={repo} />);
    
    await waitFor(() => expect(screen.getByTestId('loading-status').props.children).toBe('idle'));

    // Initial check
    expect(screen.getByTestId('leader-top').props.children).toBe('Carlos Ruiz');
    expect(screen.getByTestId('leader-current').props.children).toBe('María García');

    // Test Refresh
    fireEvent.press(screen.getByTestId('refresh-button'));
    
    await waitFor(() => expect(screen.getByTestId('loading-status').props.children).toBe('idle'));

    expect(screen.getByTestId('leader-top').props.children).toBe('Carlos Ruiz');
    expect(screen.getByTestId('leader-current').props.children).toBe('María García');
  });
});
