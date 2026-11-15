import { useState } from 'react';
import type { PwaSection } from '@/viewmodels/pwaDemo';
import { getStaffDisplayName, useStaffSession } from '@/viewmodels/useStaffSession';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { LoadingScreen } from '@/views/Spinner';

function App() {
  const { session, error, busy, login, logout, profile } = useStaffSession();

  if (session === 'restoring') {
    return <LoadingScreen label="Cargando…" />;
  }

  if (session !== 'authenticated') {
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
    />
  );
}

function StaffWorkspace({
  error,
  busy,
  logout,
  mvzName,
}: {
  error: string;
  busy: boolean;
  logout: () => Promise<void>;
  mvzName: string;
}) {
  const [activeSection, setActiveSection] = useState<PwaSection>('home');

  return (
    <AppShell
      activeSection={activeSection}
      sessionError={error}
      signingOut={busy}
      mvzName={mvzName}
      onLogout={logout}
      onNavigate={setActiveSection}
    />
  );
}

export default App;
