import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ResetPasswordScreen } from '../../screens/ResetPasswordScreen';
import { useResetPasswordFormViewModel } from '../../viewmodels/useAccessViewModels';
import { accountSession } from '../../session/accountSession';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const form = useResetPasswordFormViewModel();
  const email = typeof params.email === 'string' ? params.email : '';
  const [serverError, setServerError] = useState<string | null>(null);

  const submit = async () => {
    setServerError(null);
    if (!form.submit()) return;
    const result = await accountSession.resetPassword(email, form.code, form.password);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    router.replace('/login');
  };

  return (
    <ResetPasswordScreen
      email={email}
      code={form.code}
      password={form.password}
      confirmation={form.confirmation}
      error={serverError ?? form.error}
      onCodeChange={form.setCode}
      onPasswordChange={form.setPassword}
      onConfirmationChange={form.setConfirmation}
      onSubmit={() => submit()}
      onBackPress={() => router.back()}
    />
  );
}
