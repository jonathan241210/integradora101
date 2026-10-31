import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { LoginScreen } from '../../screens/LoginScreen';
import { useAccountSession } from '../../viewmodels/useAccountSession';
import { useLoginFormViewModel } from '../../viewmodels/useAccessViewModels';

export default function LoginRoute() {
  const router = useRouter();
  const form = useLoginFormViewModel();
  const session = useAccountSession();
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  const enterApp = async () => {
    if (inFlight.current) return;
    setServerError(null);
    if (!form.submit()) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await session.login(form.email, form.password);
      if (result.ok) {
        router.replace('/');
        return;
      }
      setServerError(result.message);
      if (result.code === 'email_not_verified') router.push('/verify-email');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <LoginScreen
      email={form.email}
      password={form.password}
      error={serverError ?? form.error}
      busy={busy}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onSubmit={() => enterApp()}
      onForgotPassword={() => router.push('/forgot-password')}
      onRegister={() => router.push('/register')}
    />
  );
}
