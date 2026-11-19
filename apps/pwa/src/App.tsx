import { useEffect, useState } from 'react';
import type { PwaSection } from '@/viewmodels/pwaDemo';
import { getStaffDisplayName, getStaffUserScope, useStaffSession } from '@/viewmodels/useStaffSession';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { LoadingScreen } from '@/views/Spinner';
import { ensureBootstrap, notifyPendingSummary, startSyncListeners } from '@/offline/sync-manager';

function App() {
  const { session, error, busy, login, logout, profile } = useStaffSession();

  if (session === 'restoring') {
    return <LoadingScreen label="Cargando…" />;
  }

  if (session !== 'authenticated' || !profile) {
    return (
      <LoginView
        busy={busy}
        error={error}
        onLogin={login}
      />
    );
  }

  return (
    <StaffWorkspace
      error={error}
      busy={busy}
      logout={logout}
      mvzName={getStaffDisplayName(profile)}
      userScope={getStaffUserScope(profile)}
    />
  );
}

function StaffWorkspace({
  error,
  busy,
  logout,
  mvzName,
  userScope,
}: {
  error: string;
  busy: boolean;
  logout: () => Promise<void>;
  mvzName: string;
  userScope: string;
}) {
  const [activeSection, setActiveSection] = useState<PwaSection>('home');

  useEffect(() => {
    void (async () => {
      await ensureBootstrap(userScope);
      await notifyPendingSummary(userScope);
    })();
    return startSyncListeners(() => userScope);
  }, [userScope]);

  return (
    <AppShell
      activeSection={activeSection}
      sessionError={error}
      signingOut={busy}
      mvzName={mvzName}
      userScope={userScope}
      onLogout={logout}
      onNavigate={setActiveSection}
    />
  );
}

export default App;
