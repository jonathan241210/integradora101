import { useCallback, useRef, useState } from 'react';
import { useScreenFocusEffect } from '../../hooks/useScreenFocusEffect';
import { useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { DeleteAccountScreen } from '../../screens/DeleteAccountScreen';
import { accountSession } from '../../session/accountSession';

export default function DeleteAccountRoute() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useScreenFocusEffect(
    useCallback(() => () => {
      setError(null);
      setPassword('');
    }, []),
  );

  const submit = async () => {
    if (inFlight.current) return;
    if (!password) {
      setError('Escribe tu contraseña para confirmar.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await accountSession.deleteAccount(password);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace('/login');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <DeleteAccountScreen
      password={password}
      error={error}
      onPasswordChange={setPassword}
      onSubmit={() => submit()}
      onBackPress={() => goBackWithinTabs(router)}
      busy={busy}
    />
  );
}
