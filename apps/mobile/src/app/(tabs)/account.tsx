import { useRouter } from 'expo-router';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { AccountScreen } from '../../screens/AccountScreen';
import { VisitorDataGate } from '../../components/ui';
import { useVisitorContentViewModel } from '../../viewmodels/useAccessViewModels';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';

export default function AccountRoute() {
  const router = useRouter();
  const { account, hasAccount, accountDeletionWarning } = useVisitorContentViewModel();
  const { loading } = useVisitorProfile();

  return (
    <VisitorDataGate
      title="Mi cuenta"
      status={hasAccount ? 'ready' : loading ? 'loading' : 'guest'}
      loadingMessage="Cargando tu cuenta…"
      onLogin={() => router.replace('/login')}
      onRetry={() => goBackWithinTabs(router)}
    >
      <AccountScreen
        displayName={account.displayName}
        email={account.email}
        warning={accountDeletionWarning}
        onBackPress={() => goBackWithinTabs(router)}
      />
    </VisitorDataGate>
  );
}
