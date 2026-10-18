import { useLocalSearchParams, useRouter } from 'expo-router';
import { ResetPasswordScreen } from '../../screens/ResetPasswordScreen';
import { useResetPasswordFormViewModel } from '../../viewmodels/useAccessViewModels';

export default function ResetPasswordRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const form = useResetPasswordFormViewModel();
  const email = typeof params.email === 'string' ? params.email : '';

  return (
    <ResetPasswordScreen
      email={email}
      code={form.code}
      password={form.password}
      confirmation={form.confirmation}
      error={form.error}
      onCodeChange={form.setCode}
      onPasswordChange={form.setPassword}
      onConfirmationChange={form.setConfirmation}
      onSubmit={() => {
        if (form.submit()) router.replace('/login');
      }}
      onBackPress={() => router.back()}
    />
  );
}
