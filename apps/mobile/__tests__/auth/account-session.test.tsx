import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import WelcomeRoute from '../../src/app/(auth)/welcome';
import LoginRoute from '../../src/app/(auth)/login';
import { authRepository } from '../../src/repositories/mockAuthRepository';
import { accountSession } from '../../src/session/accountSession';
import { tokenStorage } from '../../src/services/tokenStorage';
import { nextGateRoute } from '../../src/viewmodels/authForm';

const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

describe('Cuenta visitante simulada', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    await accountSession.resetForTests();
  });

  it('test-ca-01-auth-welcome-redirect: sin sesión se ve la bienvenida y no las pestañas', async () => {
    expect(nextGateRoute('guest', false)).toBe('/welcome');
    expect(nextGateRoute('guest', true)).toBeNull();
    const welcome = await render(<WelcomeRoute />);
    expect(welcome.getByRole('button', { name: 'Crear cuenta' })).toBeTruthy();
    expect(welcome.getByRole('button', { name: 'Iniciar sesión' })).toBeTruthy();
    fireEvent.press(welcome.getByRole('button', { name: 'Iniciar sesión' }));
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('test-ca-04-auth-errors: el login muestra 422, 403, 429 y sin conexión', async () => {
    const login = await render(<LoginRoute />);

    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'otro@ejemplo.com');
    await fireEvent.changeText(login.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await login.findByText('Correo o contraseña incorrectos.')).toBeTruthy();

    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'sin-verificar@ejemplo.com');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await login.findByText('Confirma tu correo para entrar.')).toBeTruthy();
    expect(mockPush).toHaveBeenCalledWith('/verify-email');

    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'limitado@ejemplo.com');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await login.findByText('Espera 30 segundos e inténtalo de nuevo.')).toBeTruthy();

    authRepository.offline = true;
    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await login.findByText('Sin conexión')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('test-ca-05-login-stores-tokens: el par queda en TokenStorage y la app entra a las pestañas', async () => {
    const login = await render(<LoginRoute />);
    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.changeText(login.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
    expect(await tokenStorage.read()).toEqual({
      accessToken: 'access-correo@ejemplo.com',
      refreshToken: 'refresh-correo@ejemplo.com',
    });
    expect(nextGateRoute('authenticated', false)).toBeNull();
  });

  it('test-ca-06-refresh-single-flight: varias llamadas 401 esperan un solo refresh y el fallo vuelve a la bienvenida', async () => {
    const results = await Promise.all([
      authRepository.refresh(),
      authRepository.refresh(),
      authRepository.refresh(),
    ]);
    expect(authRepository.refreshAttempts).toBe(1);
    expect(results.every((result) => result.ok)).toBe(true);

    authRepository.failRefresh = true;
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const failed = await accountSession.refresh();
    expect(failed.ok).toBe(false);
    expect(accountSession.getStatus()).toBe('guest');
    expect(await tokenStorage.read()).toBeNull();
    expect(nextGateRoute(accountSession.getStatus(), false)).toBe('/welcome');
  });

  it('test-ca-11-logout: logout borra los tokens y regresa a la bienvenida', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    await accountSession.logout();
    expect(accountSession.getStatus()).toBe('guest');
    expect(await tokenStorage.read()).toBeNull();
    expect(nextGateRoute('guest', false)).toBe('/welcome');
  });
});
