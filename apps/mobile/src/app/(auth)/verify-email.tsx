import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VerifyEmailScreen } from '../../screens/VerifyEmailScreen';
import { accountSession } from '../../session/accountSession';

export default function VerifyEmailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendWaitSeconds, setResendWaitSeconds] = useState<number | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const showTestCode = (process.env.EXPO_PUBLIC_API_URL?.trim() ?? '') === '';
  const inFlight = useRef(false);

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  const confirm = () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Escribe el código de 6 dígitos.');
      return;
    }
    return run(async () => {
      const result = await accountSession.verifyEmail(email, code);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.code === 'email_already_registered') {
        setError(null);
        setNotice(result.message);
        setAlreadyRegistered(true);
        return;
      }
      router.replace('/');
    });
  };

  const resend = () => run(async () => {
    const result = await accountSession.resendVerification(email);
    if (!result.ok) {
      setError(result.message);
      setResendWaitSeconds(result.retryAfterSeconds ?? null);
      return;
    }
    setError(null);
    setNotice(result.message);
    setResendWaitSeconds(null);
  });

  return (
    <VerifyEmailScreen
      email={email}
      code={code}
      error={error}
      notice={notice}
      resendWaitSeconds={resendWaitSeconds}
      onCodeChange={setCode}
      onSubmit={() => confirm()}
      onResend={() => resend()}
      onGoToLogin={() => router.replace('/login')}
      alreadyRegistered={alreadyRegistered}
      showTestCode={showTestCode}
      busy={busy}
    />
  );
}
