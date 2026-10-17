import { useRouter } from 'expo-router';
import { LoginScreen } from '../../screens/LoginScreen';
import { useLoginFormViewModel, useSessionViewModel } from '../../viewmodels/useAccessViewModels';

export default function LoginRoute() {
  const router = useRouter();
  const form = useLoginFormViewModel();
  const { enter } = useSessionViewModel();

  const enterApp = () => {
    if (!form.submit()) return;
    enter();
    router.replace('/');
  };

  return (
    <LoginScreen
      email={form.email}
      password={form.password}
      error={form.error}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onSubmit={enterApp}
      onGuest={() => {
        enter();
        router.replace('/');
      }}
      onForgotPassword={() => router.push('/forgot-password')}
      onRegister={() => router.push('/register')}
    />
  );
}
