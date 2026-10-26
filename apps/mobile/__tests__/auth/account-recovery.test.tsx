import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import RegisterRoute from '../../src/app/(auth)/register';
import VerifyEmailRoute from '../../src/app/(auth)/verify-email';
import ForgotPasswordRoute from '../../src/app/(auth)/forgot-password';
import ResetPasswordRoute from '../../src/app/(auth)/reset-password';
import AccountSettingsRoute from '../../src/app/(tabs)/account-settings';
import ChangePasswordRoute from '../../src/app/(tabs)/change-password';
import DeleteAccountRoute from '../../src/app/(tabs)/delete-account';
import { authRepository } from '../../src/repositories/mockAuthRepository';
import { accountSession } from '../../src/session/accountSession';
import { tokenStorage } from '../../src/services/tokenStorage';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockParams: { email?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

type PressableNode = {
  props: { onPress?: () => void };
  parent: unknown;
  unstable_fiber?: {
    memoizedProps: { onPress?: () => void } | null;
    return: PressableNode['unstable_fiber'] | null;
    type: unknown;
  } | null;
};

function pressHandler(button: PressableNode) {
  if (typeof button.props.onPress === 'function') return button.props.onPress;
  let fiber = button.unstable_fiber;
  while (fiber) {
    if (typeof fiber.memoizedProps?.onPress === 'function') return fiber.memoizedProps.onPress;
    const parent = fiber.return;
    if (parent == null || typeof parent.type === 'string') break;
    fiber = parent;
  }
  throw new Error('No hay onPress');
}

async function fillRegistration(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent.changeText(view.getByLabelText('Nombre'), 'Ana');
  await fireEvent.changeText(view.getByLabelText('Apodo'), 'Anita');
  await fireEvent.changeText(view.getByLabelText('Correo electrónico'), 'ana.nueva@correo.com');
  await fireEvent.changeText(view.getByLabelText('Contraseña'), 'secreta1');
  await fireEvent.changeText(view.getByLabelText('Confirmar contraseña'), 'secreta1');
  await fireEvent.press(view.getByRole('button', { name: 'Avatar Jaguar' }));
  await fireEvent.press(view.getByRole('checkbox', { name: 'Soy mayor de 18 años' }));
  await fireEvent.press(view.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' }));
}

describe('Cuenta visitante, corte 2', () => {
  beforeEach(async () => {
    mockPush.mockClear();
    mockReplace.mockClear();
    delete mockParams.email;
    await accountSession.resetForTests();
  });

  it('test-ca-02-register-form: campos, casillas, avatar y enlace al aviso', async () => {
    const register = await render(<RegisterRoute />);
    expect(register.getByLabelText('Nombre')).toBeTruthy();
    expect(register.getByLabelText('Apodo')).toBeTruthy();
    expect(register.getByLabelText('Correo electrónico')).toBeTruthy();
    expect(register.getByLabelText('Contraseña')).toBeTruthy();
    expect(register.getByLabelText('Confirmar contraseña')).toBeTruthy();
    expect(register.getByRole('checkbox', { name: 'Soy mayor de 18 años' })).toBeTruthy();
    expect(register.getByRole('checkbox', { name: 'Acepto el aviso de privacidad' })).toBeTruthy();
    expect(register.getByRole('button', { name: 'Avatar Jaguar' })).toBeTruthy();
    await fireEvent.press(register.getByRole('button', { name: 'Leer aviso de privacidad' }));
    expect(mockPush).toHaveBeenCalledWith('/privacy-notice');
    await fillRegistration(register);
    await fireEvent.press(register.getByRole('button', { name: 'Crear cuenta' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/verify-email',
      params: { email: 'ana.nueva@correo.com' },
    }));
  });

  it('test-ca-03-verify-email-flow: tras el alta se verifica y el reenvío respeta la espera', async () => {
    mockParams.email = 'ana.nueva@correo.com';
    await accountSession.register({
      email: 'ana.nueva@correo.com',
      firstName: 'Ana',
      nickname: 'Anita',
      password: 'secreta1',
      avatarCode: 'jaguar',
      isAdult: true,
      privacyNoticeVersion: '2026-10',
    });
    const verify = await render(<VerifyEmailRoute />);
    expect(verify.getByText(/ana.nueva@correo.com/)).toBeTruthy();
    authRepository.limitResend = true;
    await fireEvent.press(verify.getByRole('button', { name: 'Reenviar código' }));
    expect(await verify.findByText('Espera 30 segundos e inténtalo de nuevo.')).toBeTruthy();
    expect(verify.getByRole('button', { name: 'Espera 30 segundos' })).toBeTruthy();
    await fireEvent.changeText(verify.getByLabelText('Código'), '123456');
    await fireEvent.press(verify.getByRole('button', { name: 'Confirmar código' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/'));
  }, 15000);

  it('test-ca-04-auth-errors: registro y verificación muestran errores en español', async () => {
    const register = await render(<RegisterRoute />);
    await fillRegistration(register);
    await fireEvent.changeText(register.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.press(register.getByRole('button', { name: 'Crear cuenta' }));
    expect(await register.findByText('Ese correo ya está registrado.')).toBeTruthy();

    mockParams.email = 'sin-verificar@ejemplo.com';
    const verify = await render(<VerifyEmailRoute />);
    await fireEvent.changeText(verify.getByLabelText('Código'), '000000');
    await fireEvent.press(verify.getByRole('button', { name: 'Confirmar código' }));
    expect(await verify.findByText('El código no es válido.')).toBeTruthy();
  });

  it('test-ca-07-password-recovery-flow: olvido, código, nueva contraseña y regreso al login', async () => {
    const forgot = await render(<ForgotPasswordRoute />);
    await fireEvent.changeText(forgot.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.press(forgot.getByRole('button', { name: 'Enviar código' }));
    expect(await forgot.findByText(/Si el correo está registrado, enviamos un código de 6 dígitos/)).toBeTruthy();

    mockParams.email = 'correo@ejemplo.com';
    const reset = await render(<ResetPasswordRoute />);
    await fireEvent.changeText(reset.getByLabelText('Código'), '123456');
    await fireEvent.changeText(reset.getByLabelText('Nueva contraseña'), 'nueva123');
    await fireEvent.changeText(reset.getByLabelText('Confirmar contraseña'), 'nueva123');
    await fireEvent.press(reset.getByRole('button', { name: 'Restablecer contraseña' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    const failed = await accountSession.login('correo@ejemplo.com', 'secreta');
    expect(failed.ok).toBe(false);
    const entered = await accountSession.login('correo@ejemplo.com', 'nueva123');
    expect(entered.ok).toBe(true);
  });

  it('test-ca-08-profile-patch: la edición guarda apodo, nombre y avatar', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const settings = await render(<AccountSettingsRoute />);
    await waitFor(() => expect(settings.getByDisplayValue('Ana')).toBeTruthy());
    await fireEvent.changeText(settings.getByLabelText('Nombre'), 'Ana Lucía');
    await fireEvent.changeText(settings.getByLabelText('Apodo'), 'Lucha');
    await fireEvent.press(settings.getByRole('button', { name: 'Avatar León' }));
    await fireEvent.press(settings.getByRole('button', { name: 'Guardar perfil' }));
    expect(await settings.findByText('Perfil actualizado.')).toBeTruthy();
    const profile = await accountSession.getProfile();
    expect(profile).toMatchObject({ firstName: 'Ana Lucía', nickname: 'Lucha', avatarCode: 'lion' });
    expect(settings.getByText(/solo el apodo y el avatar/)).toBeTruthy();
  });

  it('test-ca-09-change-password: el cambio mantiene la sesión', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const screen = await render(<ChangePasswordRoute />);
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'secreta');
    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'nueva123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'nueva123');
    await fireEvent.press(screen.getByRole('button', { name: 'Guardar contraseña' }));
    expect(await screen.findByText('Contraseña actualizada.')).toBeTruthy();
    expect(accountSession.getStatus()).toBe('authenticated');
    expect(await tokenStorage.read()).not.toBeNull();
  });

  it('test-ca-10-delete-account: el borrado limpia los tokens y vuelve al login', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const screen = await render(<DeleteAccountRoute />);
    expect(screen.getByText(/definitivo e inmediato/)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.press(screen.getByRole('button', { name: 'Borrar mi cuenta' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    expect(accountSession.getStatus()).toBe('guest');
    expect(await tokenStorage.read()).toBeNull();
  });

  it('test-ca-08-profile-unchanged: sin cambios no llama PATCH y avisa', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const updateSpy = jest.spyOn(accountSession, 'updateProfile');
    const settings = await render(<AccountSettingsRoute />);
    await waitFor(() => expect(settings.getByDisplayValue('Ana')).toBeTruthy());
    await fireEvent.press(settings.getByRole('button', { name: 'Guardar perfil' }));
    expect(await settings.findByText('No has hecho cambios.')).toBeTruthy();
    expect(updateSpy).not.toHaveBeenCalled();
    updateSpy.mockRestore();
  });

  it('test-ca-08-profile-focus-reset: al salir no persisten avisos de éxito', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const first = await render(<AccountSettingsRoute />);
    await waitFor(() => expect(first.getByDisplayValue('Ana')).toBeTruthy());
    await fireEvent.changeText(first.getByLabelText('Nombre'), 'Ana Lucía');
    await fireEvent.press(first.getByRole('button', { name: 'Guardar perfil' }));
    await waitFor(() => expect(first.getByText('Perfil actualizado.')).toBeTruthy());
    await act(async () => {
      first.unmount();
      await Promise.resolve();
    });
    const second = await render(<AccountSettingsRoute />);
    await waitFor(() => expect(second.getByDisplayValue('Ana Lucía')).toBeTruthy());
    expect(second.queryByText('Perfil actualizado.')).toBeNull();
  });

  it('test-ca-09-password-focus-reset: al salir se limpian contraseñas y avisos', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const first = await render(<ChangePasswordRoute />);
    await waitFor(() => expect(first.getByLabelText('Contraseña actual')).toBeTruthy());
    await fireEvent.changeText(first.getByLabelText('Contraseña actual'), 'secreta');
    await fireEvent.changeText(first.getByLabelText('Nueva contraseña'), 'nueva123');
    await fireEvent.changeText(first.getByLabelText('Confirmar contraseña'), 'nueva123');
    await fireEvent.press(first.getByRole('button', { name: 'Guardar contraseña' }));
    await waitFor(() => expect(first.getByText('Contraseña actualizada.')).toBeTruthy());
    await act(async () => {
      first.unmount();
      await Promise.resolve();
    });
    const second = await render(<ChangePasswordRoute />);
    await waitFor(() => expect(second.getByLabelText('Contraseña actual')).toBeTruthy());
    expect(second.queryByText('Contraseña actualizada.')).toBeNull();
    expect(second.getByLabelText('Contraseña actual').props.value).toBe('');
    expect(second.getByLabelText('Nueva contraseña').props.value).toBe('');
    expect(second.getByLabelText('Confirmar contraseña').props.value).toBe('');
  });

  it('test-ca-08-profile-ignores-a-second-tap: un segundo toque no repite el guardado', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const settings = await render(<AccountSettingsRoute />);
    await waitFor(() => expect(settings.getByDisplayValue('Ana')).toBeTruthy());
    await fireEvent.changeText(settings.getByLabelText('Apodo'), 'Anita2');
    let release: (value: Awaited<ReturnType<typeof accountSession.updateProfile>>) => void = () => undefined;
    const spy = jest.spyOn(accountSession, 'updateProfile').mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );
    try {
      const button = settings.getByRole('button', { name: 'Guardar perfil' });
      await act(async () => {
        const handler = pressHandler(button);
        handler();
        handler();
        await Promise.resolve();
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(settings.getByLabelText('Guardando perfil…')).toBeTruthy();
      await act(async () => {
        release({ ok: true, status: 200, message: 'Perfil actualizado.' });
      });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('test-ca-09-password-ignores-a-second-tap: un segundo toque no repite el cambio de contraseña', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const screen = await render(<ChangePasswordRoute />);
    await fireEvent.changeText(screen.getByLabelText('Contraseña actual'), 'secreta');
    await fireEvent.changeText(screen.getByLabelText('Nueva contraseña'), 'nueva123');
    await fireEvent.changeText(screen.getByLabelText('Confirmar contraseña'), 'nueva123');
    let release: (value: Awaited<ReturnType<typeof accountSession.changePassword>>) => void = () => undefined;
    const spy = jest.spyOn(accountSession, 'changePassword').mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );
    try {
      const button = screen.getByRole('button', { name: 'Guardar contraseña' });
      await act(async () => {
        const handler = pressHandler(button);
        handler();
        handler();
        await Promise.resolve();
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Guardando contraseña…')).toBeTruthy();
      await act(async () => {
        release({ ok: true, status: 200, message: 'Contraseña actualizada.' });
      });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });

  it('test-ca-10-delete-ignores-a-second-tap: un segundo toque no repite el borrado', async () => {
    await accountSession.login('correo@ejemplo.com', 'secreta');
    const screen = await render(<DeleteAccountRoute />);
    await fireEvent.changeText(screen.getByLabelText('Contraseña'), 'secreta');
    let release: (value: Awaited<ReturnType<typeof accountSession.deleteAccount>>) => void = () => undefined;
    const spy = jest.spyOn(accountSession, 'deleteAccount').mockImplementation(
      () => new Promise((resolve) => { release = resolve; }),
    );
    try {
      const button = screen.getByRole('button', { name: 'Borrar mi cuenta' });
      await act(async () => {
        const handler = pressHandler(button);
        handler();
        handler();
        await Promise.resolve();
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(screen.getByLabelText('Borrando cuenta…')).toBeTruthy();
      await act(async () => {
        release({ ok: true, status: 200, message: 'Cuenta borrada.' });
      });
      await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
      expect(mockReplace).toHaveBeenCalledWith('/login');
    } finally {
      spy.mockRestore();
    }
  });
});
