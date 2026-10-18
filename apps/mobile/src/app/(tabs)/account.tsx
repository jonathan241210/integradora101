import { useRouter } from 'expo-router';
import { AccountScreen } from '../../screens/AccountScreen';
import { useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';

export default function AccountRoute() {
  const router = useRouter();
  const { account, accountDeletionWarning } = useVisitorContentViewModel();

  return (
    <AccountScreen
      displayName={account.displayName}
      email={account.email}
      warning={accountDeletionWarning}
      onBackPress={() => router.back()}
    />
  );
}
