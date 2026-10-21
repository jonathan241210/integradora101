import { useState } from 'react';
import { useRouter } from 'expo-router';
import { DeleteAccountScreen } from '../../screens/DeleteAccountScreen';
import { accountSession } from '../../session/accountSession';

export default function DeleteAccountRoute() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!password) {
      setError('Escribe tu contraseña para confirmar.');
      return;
    }
    const result = await accountSession.deleteAccount(password);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.replace('/welcome');
  };

  return (
    <DeleteAccountScreen
      password={password}
      error={error}
      onPasswordChange={setPassword}
      onSubmit={() => submit()}
      onBackPress={() => router.back()}
    />
  );
}
