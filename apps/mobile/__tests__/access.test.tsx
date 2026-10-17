import React, { useEffect } from 'react';
import { Pressable, Text, TextInput } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginRoute from '../src/app/(auth)/login';
import RegisterRoute from '../src/app/(auth)/register';
import ForgotPasswordRoute from '../src/app/(auth)/forgot-password';
import ResetPasswordRoute from '../src/app/(auth)/reset-password';
import SettingsRoute from '../src/app/(tabs)/settings';
import AccountRoute from '../src/app/(tabs)/account';
import PrivacyRoute from '../src/app/(tabs)/privacy';
import HelpRoute from '../src/app/(tabs)/help';
import AboutRoute from '../src/app/(tabs)/about';
import ProfileRoute from '../src/app/(tabs)/profile';
import { visitorAccessRepository } from '../src/repositories/visitorAccessRepository';
import { nextGateRoute, validateForgotPassword, validateLogin, validateRegister, validateResetPassword } from '../src/viewmodels/authForm';
import {
  useForgotPasswordFormViewModel,
  useLoginFormViewModel,
  useRegisterFormViewModel,
  useResetPasswordFormViewModel,
  useSessionViewModel,
  useVisitorContentViewModel,
  useVisitorPreferencesViewModel,
} from '../src/viewmodels/useAccessViewModels';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();
const mockParams: { email?: string } = {};

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => mockParams,
}));

describe('Acceso visual del visitante', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
    mockBack.mockClear();
    delete mockParams.email;
    visitorAccessRepository.resetDemoState();
  });

  it('test-ca-11: el arranque sin sesión va a Login y, al entrar, regresa al inicio', () => {
    expect(nextGateRoute('signedOut', false)).toBe('/login');
    expect(nextGateRoute('signedOut', true)).toBeNull();
    expect(nextGateRoute('entered', true)).toBe('/');
    expect(nextGateRoute('entered', false)).toBeNull();
  });

  it('test-ca-11: iniciar sesión, invitado, registro y contraseña olvidada navegan sin guardar credenciales', async () => {
    const login = await render(<LoginRoute />);
    expect(login.queryByText('Login')).toBeNull();
    expect(login.getByText('o')).toBeTruthy();
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(login.getByText('Escribe tu correo y tu contraseña.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.changeText(login.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.changeText(login.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.press(login.getByRole('button', { name: 'Iniciar sesión' }));
    expect(visitorAccessRepository.getGate()).toBe('entered');
    expect(mockReplace).toHaveBeenCalledWith('/');

    visitorAccessRepository.resetDemoState();
    await fireEvent.press(login.getByRole('button', { name: 'Entrar como invitado' }));
    expect(visitorAccessRepository.getGate()).toBe('entered');
    expect(mockReplace).toHaveBeenLastCalledWith('/');

    await fireEvent.press(login.getByRole('button', { name: '¿Olvidaste tu contraseña?' }));
    expect(mockPush).toHaveBeenCalledWith('/forgot-password');
    await fireEvent.press(login.getByRole('button', { name: 'Regístrate' }));
    expect(mockPush).toHaveBeenCalledWith('/register');
  }, 20000);

  it('test-ca-12: el registro pide los cuatro campos y advierte que la demostración no se restaura', async () => {
    const register = await render(<RegisterRoute />);
    expect(register.getByText(/Si eliminas la aplicación, no se podrá restaurar esta información/)).toBeTruthy();
    await fireEvent.press(register.getByRole('button', { name: 'Crear cuenta' }));
    expect(register.getByText('Completa nombre de usuario, correo, contraseña y confirmación.')).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    await fireEvent.changeText(register.getByLabelText('Nombre de usuario'), 'María');
    await fireEvent.changeText(register.getByLabelText('Correo electrónico'), 'maria@correo.com');
    await fireEvent.changeText(register.getByLabelText('Contraseña'), 'secreta');
    await fireEvent.changeText(register.getByLabelText('Confirmar contraseña'), 'otra');
    await fireEvent.press(register.getByRole('button', { name: 'Crear cuenta' }));
    expect(register.getByText('La confirmación no coincide con la contraseña.')).toBeTruthy();

    await fireEvent.changeText(register.getByLabelText('Confirmar contraseña'), 'secreta');
    await fireEvent.press(register.getByRole('button', { name: 'Crear cuenta' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
    expect(visitorAccessRepository.getGate()).toBe('signedOut');
  });

  it('test-ca-13: la recuperación avisa sin revelar el correo y luego pide código y contraseña nueva', async () => {
    const forgot = await render(<ForgotPasswordRoute />);
    await fireEvent.press(forgot.getByRole('button', { name: 'Enviar código' }));
    expect(forgot.getByText('Escribe tu correo.')).toBeTruthy();

    await fireEvent.changeText(forgot.getByLabelText('Correo electrónico'), 'correo@ejemplo.com');
    await fireEvent.press(forgot.getByRole('button', { name: 'Enviar código' }));
    expect(forgot.getByText(/Si el correo está registrado, enviamos un código de 6 dígitos/)).toBeTruthy();
    await fireEvent.press(forgot.getByRole('button', { name: 'Ya tengo el código' }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/reset-password', params: { email: 'correo@ejemplo.com' } });

    mockParams.email = 'correo@ejemplo.com';
    const reset = await render(<ResetPasswordRoute />);
    expect(reset.getByText(/Código para correo@ejemplo.com/)).toBeTruthy();
    await fireEvent.changeText(reset.getByLabelText('Código'), '1234');
    await fireEvent.changeText(reset.getByLabelText('Nueva contraseña'), 'nueva');
    await fireEvent.changeText(reset.getByLabelText('Confirmar contraseña'), 'nueva');
    await fireEvent.press(reset.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(reset.getByText('Escribe el código de 6 dígitos.')).toBeTruthy();

    await fireEvent.changeText(reset.getByLabelText('Código'), '123456');
    await fireEvent.press(reset.getByRole('button', { name: 'Restablecer contraseña' }));
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('test-ca-14: Ajustes cambia interruptores en pantalla y abre las filas; cerrar sesión vuelve a Login', async () => {
    visitorAccessRepository.enter();
    const settings = await render(<SettingsRoute />);
    expect(settings.getByText('María García')).toBeTruthy();
    expect(settings.getByText('maria.garcia@correo.com')).toBeTruthy();

    expect(settings.getByLabelText('Modo oscuro').props.value).toBe(false);
    await fireEvent(settings.getByLabelText('Modo oscuro'), 'valueChange', true);
    expect(settings.getByLabelText('Modo oscuro').props.value).toBe(true);
    expect(visitorAccessRepository.getPreferences().darkMode).toBe(true);
    expect(visitorAccessRepository.getPreferences().notifications).toBe(true);
    expect(settings.queryByText('Sonidos y efectos')).toBeNull();
    expect(settings.queryByText('Idioma')).toBeNull();

    await fireEvent.press(settings.getByLabelText('Cuenta de María García'));
    expect(mockPush).toHaveBeenCalledWith('/account');
    await fireEvent.press(settings.getByLabelText('Privacidad'));
    expect(mockPush).toHaveBeenCalledWith('/privacy');
    await fireEvent.press(settings.getByLabelText('Ayuda y soporte'));
    expect(mockPush).toHaveBeenCalledWith('/help');
    await fireEvent.press(settings.getByLabelText('Acerca de ARCA-NB v1.0.0'));
    expect(mockPush).toHaveBeenCalledWith('/about');

    await fireEvent.press(settings.getByRole('button', { name: 'Cerrar sesión' }));
    expect(visitorAccessRepository.getGate()).toBe('signedOut');
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('test-ca-14 y test-ca-15: Perfil abre Ajustes y las filas muestran cuenta, aviso, ayuda y acerca de', async () => {
    const profile = await render(<ProfileRoute />);
    await waitFor(() => expect(profile.getByText('María García')).toBeTruthy());
    expect(profile.getByText('Perfil')).toBeTruthy();
    await fireEvent.press(profile.getByRole('button', { name: 'Ajustes' }));
    expect(mockPush).toHaveBeenCalledWith('/settings');

    const account = await render(<AccountRoute />);
    expect(account.getByText('maria.garcia@correo.com')).toBeTruthy();
    expect(account.getByText(/no se podrá restaurar esta información/)).toBeTruthy();

    const privacy = await render(<PrivacyRoute />);
    expect(privacy.getByText('Qué datos recopila')).toBeTruthy();
    expect(privacy.getByText('Para qué se utilizan')).toBeTruthy();
    expect(privacy.getByText('Cómo se protegen')).toBeTruthy();
    expect(privacy.getByText('Cómo ejercer tus derechos')).toBeTruthy();

    const help = await render(<HelpRoute />);
    expect(help.getByText('Contraseña olvidada')).toBeTruthy();
    const about = await render(<AboutRoute />);
    expect(about.getByText(/versión 1.0.0/)).toBeTruthy();
    expect(about.getByText(/Nicolás Bravo/)).toBeTruthy();
  });

  it('test-ca-12 y test-ca-13: la validación rechaza correos, confirmaciones y códigos incompletos', () => {
    expect(validateLogin('no-es-correo', 'secreta')).toBe('Escribe un correo válido.');
    expect(validateLogin('a@b.com', 'secreta')).toBeNull();
    expect(validateRegister({ username: 'Ana', email: 'ana', password: 'a', confirmation: 'a' })).toBe('Escribe un correo válido.');
    expect(validateRegister({ username: 'Ana', email: 'ana@correo.com', password: 'a', confirmation: 'a' })).toBeNull();
    expect(validateForgotPassword('ana')).toBe('Escribe un correo válido.');
    expect(validateForgotPassword('ana@correo.com')).toBeNull();
    expect(validateResetPassword({ code: '123456', password: 'a', confirmation: '' })).toBe('Escribe y confirma la nueva contraseña.');
    expect(validateResetPassword({ code: '123456', password: 'a', confirmation: 'b' })).toBe('La confirmación no coincide con la contraseña.');
    expect(validateResetPassword({ code: '123456', password: 'a', confirmation: 'a' })).toBeNull();
  });

  it('test-ca-08: los viewmodels de acceso conservan la compuerta, los interruptores y el aviso', async () => {
    const seen = jest.fn();
    const Probe = () => {
      const session = useSessionViewModel();
      const preferences = useVisitorPreferencesViewModel();
      const content = useVisitorContentViewModel();
      const login = useLoginFormViewModel();
      const register = useRegisterFormViewModel();
      const forgot = useForgotPasswordFormViewModel(content.forgotPasswordNotice);
      const reset = useResetPasswordFormViewModel();
      useEffect(() => {
        seen({
          privacy: content.privacySections.length,
          help: content.helpSections.length,
          about: content.aboutSections.length,
          account: content.account.email,
        });
      }, [content]);
      return (
        <>
          <Text>{session.status}</Text>
          <Text>{preferences.preferences.notifications ? 'notifications-on' : 'notifications-off'}</Text>
          <Text>{login.error ?? 'login-ok'}</Text>
          <Text>{register.error ?? 'register-ok'}</Text>
          <Text>{forgot.sentNotice ?? 'forgot-empty'}</Text>
          <Text>{reset.error ?? 'reset-ok'}</Text>
          <TextInput accessibilityLabel="login-email" value={login.email} onChangeText={login.setEmail} />
          <TextInput accessibilityLabel="login-password" value={login.password} onChangeText={login.setPassword} />
          <Pressable testID="login-submit" onPress={login.submit} />
          <TextInput accessibilityLabel="username" value={register.username} onChangeText={register.setUsername} />
          <TextInput accessibilityLabel="register-email" value={register.email} onChangeText={register.setEmail} />
          <TextInput accessibilityLabel="register-password" value={register.password} onChangeText={register.setPassword} />
          <TextInput accessibilityLabel="register-confirmation" value={register.confirmation} onChangeText={register.setConfirmation} />
          <Pressable testID="register-submit" onPress={register.submit} />
          <TextInput accessibilityLabel="forgot-email" value={forgot.email} onChangeText={forgot.setEmail} />
          <Pressable testID="forgot-submit" onPress={forgot.submit} />
          <TextInput accessibilityLabel="code" value={reset.code} onChangeText={reset.setCode} />
          <TextInput accessibilityLabel="reset-password" value={reset.password} onChangeText={reset.setPassword} />
          <TextInput accessibilityLabel="reset-confirmation" value={reset.confirmation} onChangeText={reset.setConfirmation} />
          <Pressable testID="reset-submit" onPress={reset.submit} />
          <Pressable testID="enter" onPress={session.enter} />
          <Pressable testID="leave" onPress={session.leave} />
          <Pressable testID="mute" onPress={() => preferences.setPreference('notifications', false)} />
        </>
      );
    };

    const view = await render(<Probe />);
    await waitFor(() => expect(seen).toHaveBeenCalledWith({
      privacy: 4,
      help: 4,
      about: 3,
      account: 'maria.garcia@correo.com',
    }));

    await fireEvent.press(view.getByTestId('login-submit'));
    expect(view.getByText('Escribe tu correo y tu contraseña.')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('login-email'), 'a@b.com');
    await fireEvent.changeText(view.getByLabelText('login-password'), 'secreta');
    await fireEvent.press(view.getByTestId('login-submit'));
    expect(view.getByText('login-ok')).toBeTruthy();

    await fireEvent.press(view.getByTestId('register-submit'));
    expect(view.getByText('Completa nombre de usuario, correo, contraseña y confirmación.')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('username'), 'Ana');
    await fireEvent.changeText(view.getByLabelText('register-email'), 'ana@correo.com');
    await fireEvent.changeText(view.getByLabelText('register-password'), 'secreta');
    await fireEvent.changeText(view.getByLabelText('register-confirmation'), 'secreta');
    await fireEvent.press(view.getByTestId('register-submit'));
    expect(view.getByText('register-ok')).toBeTruthy();

    await fireEvent.press(view.getByTestId('forgot-submit'));
    expect(view.getByText('forgot-empty')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('forgot-email'), 'ana@correo.com');
    await fireEvent.press(view.getByTestId('forgot-submit'));
    expect(view.getByText(/Si el correo está registrado/)).toBeTruthy();

    await fireEvent.press(view.getByTestId('reset-submit'));
    expect(view.getByText('Escribe el código de 6 dígitos.')).toBeTruthy();
    await fireEvent.changeText(view.getByLabelText('code'), '123456');
    await fireEvent.changeText(view.getByLabelText('reset-password'), 'nueva');
    await fireEvent.changeText(view.getByLabelText('reset-confirmation'), 'nueva');
    await fireEvent.press(view.getByTestId('reset-submit'));
    expect(view.getByText('reset-ok')).toBeTruthy();

    await fireEvent.press(view.getByTestId('enter'));
    expect(view.getByText('entered')).toBeTruthy();
    await fireEvent.press(view.getByTestId('mute'));
    expect(view.getByText('notifications-off')).toBeTruthy();
    await fireEvent.press(view.getByTestId('leave'));
    expect(view.getByText('signedOut')).toBeTruthy();
    view.unmount();
  });
});
