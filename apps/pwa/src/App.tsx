import { useState } from 'react';
import type { PwaSection } from '@/viewmodels/pwaDemo';
import { usePwaInstall, type PwaInstallController } from '@/viewmodels/usePwaInstall';
import { getStaffDisplayName, useStaffSession } from '@/viewmodels/useStaffSession';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { LoadingScreen } from '@/views/Spinner';

function App() {
  const installController = usePwaInstall();
  const { session, error, busy, login, logout, profile } = useStaffSession();

  if (session === 'restoring') {
    return <LoadingScreen label="Cargando…" />;
  }

  if (session !== 'authenticated') {
    return (
      <LoginView
        busy={busy}
        error={error}
        installController={installController}
        onLogin={login}
      />
    );
  }

  return (
    <StaffWorkspace
      installController={installController}
      error={error}
      busy={busy}
      logout={logout}
      mvzName={getStaffDisplayName(profile)}
    />
  );
}

function StaffWorkspace({
  installController,
  error,
  busy,
  logout,
  mvzName,
}: {
  installController: PwaInstallController;
  error: string;
  busy: boolean;
  logout: () => Promise<void>;
  mvzName: string;
}) {
  const [activeSection, setActiveSection] = useState<PwaSection>('home');

  return (
    <AppShell
      activeSection={activeSection}
      installController={installController}
      sessionError={error}
      signingOut={busy}
      mvzName={mvzName}
      onLogout={logout}
      onNavigate={setActiveSection}
    />
  );
}

export default App;
