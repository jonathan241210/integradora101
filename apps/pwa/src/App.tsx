import { useEffect, useState } from 'react';
import { onVeterinarianUnauthorized } from '@/services/veterinarianApi';
import type { PwaSection } from '@/viewmodels/pwaDemo';
import { getStaffDisplayName, getStaffUserScope, useStaffSession } from '@/viewmodels/useStaffSession';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { LoadingScreen } from '@/views/Spinner';
import { LogoutConfirmDialog } from '@/views/LogoutConfirmDialog';
import { ensureBootstrap, notifyPendingSummary, startSyncListeners } from '@/offline/sync-manager';

function App() {
  const { session, error, retryAfterSeconds, busy, login, logout, pendingLogout, confirmLogout, cancelLogout, profile, expireSession } = useStaffSession();

  useEffect(() => {
    onVeterinarianUnauthorized(expireSession);
    return () => onVeterinarianUnauthorized(undefined);
  }, [expireSession]);

  if (session === 'restoring') {
    return <LoadingScreen label="Cargando…" />;
  }

  if (session !== 'authenticated' || !profile) {
    return (
      <LoginView
        busy={busy}
        error={error}
        retryAfterSeconds={retryAfterSeconds}
        onLogin={login}
      />
    );
  }

  return (
    <StaffWorkspace
      error={error}
      busy={busy}
      logout={logout}
      pendingLogout={pendingLogout}
      confirmLogout={confirmLogout}
      cancelLogout={cancelLogout}
      mvzName={getStaffDisplayName(profile)}
      userScope={getStaffUserScope(profile)}
      roles={profile?.roles ?? []}
    />
  );
}

function StaffWorkspace({
  error,
  busy,
  logout,
  pendingLogout,
  confirmLogout,
  cancelLogout,
  mvzName,
  userScope,
  roles,
}: {
  error: string;
  busy: boolean;
  logout: () => Promise<void>;
  pendingLogout: number | null;
  confirmLogout: () => Promise<void>;
  cancelLogout: () => void;
  mvzName: string;
  userScope: string;
  roles: string[];
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
    <>
    <AppShell
      activeSection={activeSection}
      sessionError={error}
      signingOut={busy}
      mvzName={mvzName}
      userScope={userScope}
      roles={roles}
      onLogout={logout}
      onNavigate={setActiveSection}
    />
    <LogoutConfirmDialog pending={pendingLogout} busy={busy} onConfirm={confirmLogout} onCancel={cancelLogout} />
    </>
  );
}

export default App;
