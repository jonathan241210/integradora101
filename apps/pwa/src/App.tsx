import { useReducer } from 'react';
import { AppShell } from '@/views/AppShell';
import { LoginView } from '@/views/LoginView';
import { usePwaInstall } from '@/viewmodels/usePwaInstall';
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

  if (!state.isLoggedIn) {
    return (
      <LoginView
        error={state.loginError}
        installController={installController}
        onLogin={(username, password) =>
          dispatch({ type: 'login', username, password })
        }
      />
    );
  }

  return (
    <AppShell
      activeSection={state.activeSection}
      installController={installController}
      onLogout={() => dispatch({ type: 'logout' })}
      onNavigate={(section) => dispatch({ type: 'navigate', section })}
    />
  );
}

export default App;
