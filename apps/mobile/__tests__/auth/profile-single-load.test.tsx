import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import SettingsRoute from '../../src/app/(tabs)/settings';
import { authRepository } from '../../src/repositories/mockAuthRepository';
import { accountSession } from '../../src/session/accountSession';
import { createSecureTokenStorage } from '../../src/services/tokenStorage';
import { useVisitorProfile } from '../../src/viewmodels/useVisitorProfile';

const mockItems = new Map<string, string>();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/settings',
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: (key: string) => Promise.resolve(mockItems.get(key) ?? null),
  setItemAsync: (key: string, value: string) => {
    mockItems.set(key, value);
    return Promise.resolve();
  },
  deleteItemAsync: (key: string) => {
    mockItems.delete(key);
    return Promise.resolve();
  },
}));

const httpProfile = {
  email: 'ana@ejemplo.com',
  first_name: 'Ana',
  nickname: 'Anita',
  avatar_code: 'jaguar',
};

function jsonResponse(status: number, body: unknown) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
    body: { cancel: async () => undefined },
  } as unknown as Response;
}

function Consumer({ name }: { name: string }) {
  const { profile, loading } = useVisitorProfile();
  if (loading && !profile) return <Text>{`${name}:cargando`}</Text>;
  return <Text>{`${name}:${profile?.nickname ?? 'vacio'}`}</Text>;
}

describe('una sola lectura de perfil', () => {
  beforeEach(async () => {
    mockItems.clear();
    await accountSession.resetForTests();
  });

  it('test-ca-08-profile-single-load: dos pantallas comparten un GET y el PATCH no repite la lectura', async () => {
    let release: (profile: Awaited<ReturnType<typeof authRepository.getProfile>>) => void = () => undefined;
    let calls = 0;
    const spy = jest.spyOn(authRepository, 'getProfile').mockImplementation(() => {
      calls += 1;
      return new Promise((resolve) => {
        release = resolve;
      });
    });

    try {
      const pending = accountSession.login('correo@ejemplo.com', 'secreta');
      const view = await render(
        <>
          <Consumer name="perfil" />
          <Consumer name="ajustes" />
        </>,
      );
      await waitFor(() => expect(calls).toBe(1));
      expect(accountSession.peekProfile()).toBeNull();

      await act(async () => {
        release({
          email: 'correo@ejemplo.com',
          firstName: 'Ana',
          nickname: 'Anita',
          avatarCode: 'jaguar',
        });
        await pending;
      });

      await waitFor(() => {
        expect(view.getByText('perfil:Anita')).toBeTruthy();
        expect(view.getByText('ajustes:Anita')).toBeTruthy();
      });
      expect(accountSession.peekProfile()?.nickname).toBe('Anita');

      await act(async () => {
        await accountSession.updateProfile({ firstName: 'Ana', nickname: 'Nita', avatarCode: 'wolf' });
      });

      await waitFor(() => {
        expect(view.getByText('perfil:Nita')).toBeTruthy();
        expect(view.getByText('ajustes:Nita')).toBeTruthy();
      });
      expect(calls).toBe(1);
      expect(accountSession.peekProfile()).toMatchObject({ nickname: 'Nita', avatarCode: 'wolf' });

      await act(async () => {
        await accountSession.logout();
      });
      expect(accountSession.peekProfile()).toBeNull();
      await waitFor(() => {
        expect(view.getByText('perfil:vacio')).toBeTruthy();
        expect(view.getByText('ajustes:vacio')).toBeTruthy();
      });
      expect(calls).toBe(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('test-ca-08-settings-sin-ficha-demo: con la API simulada, Ajustes no muestra María García', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/v1/visitor/me')) {
        return jsonResponse(200, { data: httpProfile });
      }
      return jsonResponse(404, { message: 'No encontrado.' });
    });
    accountSession.configureForTests({
      apiUrl: 'https://api.pruebas.invalid',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    await createSecureTokenStorage().write({ accessToken: 'access-http', refreshToken: 'refresh-http' });
    await accountSession.bootstrap();
    const readsAfterBootstrap = fetchImpl.mock.calls.length;

    const settings = await render(<SettingsRoute />);
    expect(settings.queryByText('María García')).toBeNull();
    expect(settings.queryByText('maria.garcia@correo.com')).toBeNull();
    expect(settings.getByText('Ana')).toBeTruthy();
    expect(settings.getByText('ana@ejemplo.com')).toBeTruthy();
    expect(fetchImpl).toHaveBeenCalledTimes(readsAfterBootstrap);
  });
});
