import { useEffect, useReducer, useState } from 'react';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { usePwaInstall } from '@/viewmodels/usePwaInstall';
import {
  fetchCurrentUser,
  getToken,
  login,
  logout,
  onUnauthorized,
} from '@/services/apiClient';
import {
  initialPwaDemoState,
  pwaDemoReducer,
} from '@/viewmodels/pwaDemo';

function App() {
  const [state, dispatch] = useReducer(
    pwaDemoReducer,
    initialPwaDemoState,
  );
  const installController = usePwaInstall();
  const [loginError, setLoginError] = useState('');
  const [busy, setBusy] = useState(false);
  const [restoring, setRestoring] = useState(() => getToken() !== null);

  useEffect(() => {
    onUnauthorized(() => {
      setLoginError('Tu sesión expiró. Vuelve a iniciar sesión.');
      dispatch({ type: 'logout' });
    });

    if (getToken()) {
      fetchCurrentUser()
        .then(() => dispatch({ type: 'authenticated' }))
        .catch(() => undefined)
        .finally(() => setRestoring(false));
    }

    return () => onUnauthorized(null);
  }, []);

  async function handleLogin(email: string, password: string) {
    setBusy(true);
    setLoginError('');
    try {
      await login(email.trim(), password);
      dispatch({ type: 'authenticated' });
    } catch (error) {
      setLoginError(
        error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    dispatch({ type: 'logout' });
  }

  if (restoring) {
    return null;
  }

  if (!state.isLoggedIn) {
    return (
      <LoginView
        busy={busy}
        error={loginError || state.loginError}
        installController={installController}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <AppShell
      activeSection={state.activeSection}
      installController={installController}
      onLogout={handleLogout}
      onNavigate={(section) => dispatch({ type: 'navigate', section })}
    />
  );
}

export default App;
