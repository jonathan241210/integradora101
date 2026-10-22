import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LoginScreen } from '../../screens/LoginScreen';
import { useAccountSession } from '../../viewmodels/useAccountSession';
import { useLoginFormViewModel } from '../../viewmodels/useAccessViewModels';

export default function LoginRoute() {
  const router = useRouter();
  const form = useLoginFormViewModel();
  const session = useAccountSession();
  const [serverError, setServerError] = useState<string | null>(null);

  const enterApp = async () => {
    setServerError(null);
    if (!form.submit()) return;
    const result = await session.login(form.email, form.password);
    if (result.ok) {
      router.replace('/');
      return;
    }
    setServerError(result.message);
    if (result.code === 'email_not_verified') router.push('/verify-email');
  };

  return (
    <LoginScreen
      email={form.email}
      password={form.password}
      error={serverError ?? form.error}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onSubmit={() => enterApp()}
      onForgotPassword={() => router.push('/forgot-password')}
      onRegister={() => router.push('/register')}
    />
  );
}
