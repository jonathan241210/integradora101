import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProfileRoute from '../../src/app/(tabs)/profile';
import SettingsRoute from '../../src/app/(tabs)/settings';
import { accountSession } from '../../src/session/accountSession';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('Identidad visible de la cuenta', () => {
  beforeEach(() => accountSession.resetForTests());

  it('test-ca-03-visible-identity: el perfil muestra el apodo y ajustes el nombre y el correo', async () => {
    const login = await accountSession.login('correo@ejemplo.com', 'secreta');
    expect(login.ok).toBe(true);

    const profile = await render(<ProfileRoute />);
    await waitFor(() => {
      expect(profile.getByText('Anita')).toBeTruthy();
      expect(profile.getByText('Jaguar')).toBeTruthy();
    });
    expect(profile.queryByText('María García')).toBeNull();
    expect(profile.queryByText('correo@ejemplo.com')).toBeNull();

    const settings = await render(<SettingsRoute />);
    await waitFor(() => {
      expect(settings.getByText('Ana')).toBeTruthy();
      expect(settings.getByText('correo@ejemplo.com')).toBeTruthy();
    });
    expect(settings.queryByText('María García')).toBeNull();
    expect(settings.queryByText('maria.garcia@correo.com')).toBeNull();
  });
});
