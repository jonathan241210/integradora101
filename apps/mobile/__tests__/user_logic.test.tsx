import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Text, TouchableOpacity } from 'react-native';
import { useUserViewModel } from '../src/viewmodels/useUserViewModel';
import { UserRepositoryImpl } from '../src/repositories/userRepository';

const TestUserComponent = ({ repo }: { repo: UserRepositoryImpl }) => {
  const { user, missions, loading, refresh } = useUserViewModel(repo);

  return (
    <>
      <Text testID="loading-status">{loading ? 'loading' : 'idle'}</Text>
      <Text testID="user-name">{user?.name || 'no-user'}</Text>
      <Text testID="user-points">{user?.points || 0}</Text>
      <Text testID="missions-count">{missions.length}</Text>
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

  it('should refresh missions without a leaderboard', async () => {
    await render(<TestUserComponent repo={repo} />);

    await waitFor(() => expect(screen.getByTestId('loading-status').props.children).toBe('idle'));
    expect(parseInt(screen.getByTestId('missions-count').props.children)).toBeGreaterThan(0);

    fireEvent.press(screen.getByTestId('refresh-button'));

    await waitFor(() => expect(screen.getByTestId('loading-status').props.children).toBe('idle'));
    expect(screen.getByTestId('user-name').props.children).toBe('María García');
  });
});
