import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { goBackWithinTabs } from '../../navigation/tabBack';
import { useVisitorPreferencesViewModel } from '../../viewmodels/useAccessViewModels';
import { useAccountSession } from '../../viewmodels/useAccountSession';
import { useVisitorProfile } from '../../viewmodels/useVisitorProfile';

export default function SettingsRoute() {
  const router = useRouter();
  const { preferences, setPreference } = useVisitorPreferencesViewModel();
  const { logout } = useAccountSession();
  const { profile, loading } = useVisitorProfile();
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);

  return (
    <SettingsScreen
      accountName={profile?.firstName ?? ''}
      accountEmail={profile?.email ?? ''}
      accountBusy={loading && !profile}
      preferences={preferences}
      onToggle={setPreference}
      onAccountPress={() => router.push('/account-settings')}
      onPrivacyPress={() => router.push('/privacy')}
      onHelpPress={() => router.push('/help')}
      onAboutPress={() => router.push('/about')}
      onLogout={() => {
        if (inFlight.current) return;
        inFlight.current = true;
        setBusy(true);
        void logout()
          .then(() => router.replace('/login'))
          .finally(() => {
            inFlight.current = false;
            setBusy(false);
          });
      }}
      onBackPress={() => goBackWithinTabs(router)}
      busy={busy}
    />
  );
}
