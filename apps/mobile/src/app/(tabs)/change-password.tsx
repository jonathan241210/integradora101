import { useCallback, useRef, useState } from 'react';
import { useScreenFocusEffect } from '../../hooks/useScreenFocusEffect';
import { useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { ChangePasswordScreen } from '../../screens/ChangePasswordScreen';
import { accountSession } from '../../session/accountSession';

export default function ChangePasswordRoute() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  useScreenFocusEffect(
    useCallback(() => () => {
      setNotice(null);
      setError(null);
      setCurrentPassword('');
      setPassword('');
      setConfirmation('');
    }, []),
  );

  const submit = async () => {
    if (inFlight.current) return;
    if (!currentPassword || !password || !confirmation) {
      setError('Escribe la contraseña actual, la nueva y la confirmación.');
      return;
    }
    if (password !== confirmation) {
      setError('La confirmación no coincide con la contraseña.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    try {
      const result = await accountSession.changePassword(currentPassword, password);
      if (!result.ok) {
        setNotice(null);
        setError(result.message);
        return;
      }
      setError(null);
      setNotice(result.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };

  return (
    <ChangePasswordScreen
      currentPassword={currentPassword}
      password={password}
      confirmation={confirmation}
      error={error}
      notice={notice}
      onCurrentPasswordChange={setCurrentPassword}
      onPasswordChange={setPassword}
      onConfirmationChange={setConfirmation}
      onSubmit={() => submit()}
      onBackPress={() => goBackWithinTabs(router)}
      busy={busy}
    />
  );
}
