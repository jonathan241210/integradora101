import { useRouter } from 'expo-router';
import { ForgotPasswordScreen } from '../../screens/ForgotPasswordScreen';
import { useForgotPasswordFormViewModel, useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function ForgotPasswordRoute() {
  const router = useRouter();
  const { forgotPasswordNotice } = useVisitorContentViewModel();
  const form = useForgotPasswordFormViewModel(forgotPasswordNotice);

  return (
    <ForgotPasswordScreen
      email={form.email}
      error={form.error}
      notice={form.sentNotice}
      onEmailChange={form.setEmail}
      onSubmit={form.submit}
      onContinue={() => router.push({ pathname: '/reset-password', params: { email: form.email.trim() } })}
      onBackPress={() => router.back()}
    />
  );
}
