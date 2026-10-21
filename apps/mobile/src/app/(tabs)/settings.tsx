import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { accountSession } from '../../session/accountSession';
import { useVisitorContentViewModel, useVisitorPreferencesViewModel } from '../../viewmodels/useAccessViewModels';
import { useAccountSession } from '../../viewmodels/useAccountSession';

export default function SettingsRoute() {
  const router = useRouter();
  const { account } = useVisitorContentViewModel();
  const { preferences, setPreference } = useVisitorPreferencesViewModel();
  const { logout } = useAccountSession();
  const [accountName, setAccountName] = useState(account.displayName);
  const [accountEmail, setAccountEmail] = useState(account.email);

  useEffect(() => {
    let active = true;
    const load = () => {
      void accountSession.getProfile().then((profile) => {
        if (!active || !profile) return;
        setAccountName(profile.firstName);
        setAccountEmail(profile.email);
      });
    };
    load();
    const unsubscribe = accountSession.subscribe(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return (
    <SettingsScreen
      accountName={accountName}
      accountEmail={accountEmail}
      preferences={preferences}
      onToggle={setPreference}
      onAccountPress={() => router.push('/account-settings')}
      onPrivacyPress={() => router.push('/privacy')}
      onHelpPress={() => router.push('/help')}
      onAboutPress={() => router.push('/about')}
      onLogout={() => {
        void logout().then(() => router.replace('/welcome'));
      }}
      onBackPress={() => router.back()}
    />
  );
}
