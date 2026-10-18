import { useRouter } from 'expo-router';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { useSessionViewModel, useVisitorContentViewModel, useVisitorPreferencesViewModel } from '../../viewmodels/useAccessViewModels';

export default function SettingsRoute() {
  const router = useRouter();
  const { account } = useVisitorContentViewModel();
  const { preferences, setPreference } = useVisitorPreferencesViewModel();
  const { leave } = useSessionViewModel();

  return (
    <SettingsScreen
      accountName={account.displayName}
      accountEmail={account.email}
      preferences={preferences}
      onToggle={setPreference}
      onAccountPress={() => router.push('/account')}
      onPrivacyPress={() => router.push('/privacy')}
      onHelpPress={() => router.push('/help')}
      onAboutPress={() => router.push('/about')}
      onLogout={() => {
        leave();
        router.replace('/login');
      }}
      onBackPress={() => router.back()}
    />
  );
}
