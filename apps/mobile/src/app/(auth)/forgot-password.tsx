import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ForgotPasswordScreen } from '../../screens/ForgotPasswordScreen';
import { useForgotPasswordFormViewModel } from '../../viewmodels/useAccessViewModels';
import { accountSession } from '../../session/accountSession';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const form = useForgotPasswordFormViewModel('');
  const [notice, setNotice] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const continued = useRef(false);

  const submit = async () => {
    if (inFlight.current) return;
    setNotice(null);
    setServerError(null);
    if (!form.submit()) return;
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await accountSession.forgotPassword(form.email);
      if (!result.ok) {
        setServerError(result.message);
        return;
      }
      setNotice(result.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <ForgotPasswordScreen
      email={form.email}
      error={serverError ?? form.error}
      notice={notice}
      onEmailChange={form.setEmail}
      onSubmit={() => submit()}
      onContinue={() => {
        if (continued.current) return;
        continued.current = true;
        router.push({ pathname: '/reset-password', params: { email: form.email.trim() } });
      }}
      onBackPress={() => router.back()}
      busy={busy}
    />
  );
}
