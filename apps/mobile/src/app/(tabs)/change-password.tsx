import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ChangePasswordScreen } from '../../screens/ChangePasswordScreen';
import { accountSession } from '../../session/accountSession';

export default function ChangePasswordRoute() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async () => {
    if (!currentPassword || !password || !confirmation) {
      setError('Escribe la contraseña actual, la nueva y la confirmación.');
      return;
    }
    if (password !== confirmation) {
      setError('La confirmación no coincide con la contraseña.');
      return;
    }
    const result = await accountSession.changePassword(currentPassword, password);
    if (!result.ok) {
      setNotice(null);
      setError(result.message);
      return;
    }
    setError(null);
    setNotice(result.message);
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
      onBackPress={() => router.back()}
    />
  );
}
