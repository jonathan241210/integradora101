import { useState } from 'react';
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

  const confirm = async () => {
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Escribe el código de 6 dígitos.');
      return;
    }
    const result = await accountSession.verifyEmail(email, code);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace('/');
  };

  const resend = async () => {
    const result = await accountSession.resendVerification(email);
    if (!result.ok) {
      setError(result.message);
      setResendWaitSeconds(result.retryAfterSeconds ?? null);
      return;
    }
    setError(null);
    setNotice(result.message);
    setResendWaitSeconds(null);
  };

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
    />
  );
}
