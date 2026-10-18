import { useRouter } from 'expo-router';
import { RegisterScreen } from '../../screens/RegisterScreen';
import { useRegisterFormViewModel, useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function RegisterRoute() {
  const router = useRouter();
  const form = useRegisterFormViewModel();
  const { accountDeletionWarning } = useVisitorContentViewModel();

  return (
    <RegisterScreen
      username={form.username}
      email={form.email}
      password={form.password}
      confirmation={form.confirmation}
      error={form.error}
      warning={accountDeletionWarning}
      onUsernameChange={form.setUsername}
      onEmailChange={form.setEmail}
      onPasswordChange={form.setPassword}
      onConfirmationChange={form.setConfirmation}
      onSubmit={() => {
        if (form.submit()) router.replace('/login');
      }}
      onBackPress={() => router.back()}
    />
  );
}
