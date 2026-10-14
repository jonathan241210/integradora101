import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manualInstallController } from '@/tests/testFixtures';
import { LoginView } from '@/views/LoginView';
import {
  demoCredentials,
  initialPwaDemoState,
  pwaDemoReducer,
} from '@/viewmodels/pwaDemo';

describe('CA-01 PWA responsive demo login', () => {
  it('muestra campos etiquetados, credenciales ficticias y aviso de demostración', () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error=""
        installController={manualInstallController}
        onLogin={() => undefined}
      />,
    );

    expect(markup).toContain('Iniciar sesión');
    expect(markup).toContain('Correo electrónico');
    expect(markup).toContain('Contraseña');
    expect(markup).toContain(demoCredentials.username);
    expect(markup).toContain(demoCredentials.password);
    expect(markup).toContain(
      'este acceso no autentica ni protege información',
    );
    expect(markup).toContain('type="password"');
  });
});

describe('CA-02 PWA responsive demo login', () => {
  it('permite el acceso de demostración solo con las credenciales propuestas', () => {
    const accepted = pwaDemoReducer(initialPwaDemoState, {
      type: 'login',
      username: demoCredentials.username,
      password: demoCredentials.password,
    });

    expect(accepted.isLoggedIn).toBe(true);
    expect(accepted.activeSection).toBe('home');
    expect(accepted.loginError).toBe('');
  });

  it('informa el error, no conserva el acceso y cierra la sesión en memoria', () => {
    const rejected = pwaDemoReducer(initialPwaDemoState, {
      type: 'login',
      username: 'incorrecto@demo.local',
      password: 'incorrecta',
    });
    const signedIn = pwaDemoReducer(initialPwaDemoState, {
      type: 'login',
      username: demoCredentials.username,
      password: demoCredentials.password,
    });
    const signedOut = pwaDemoReducer(signedIn, { type: 'logout' });
    const markup = renderToStaticMarkup(
      <LoginView
        error={rejected.loginError}
        installController={manualInstallController}
        onLogin={() => undefined}
      />,
    );

    expect(rejected.isLoggedIn).toBe(false);
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('no son correctos');
    expect(signedOut).toEqual(initialPwaDemoState);
  });

  it('no permite cambiar de sección cuando no existe una sesión de demo', () => {
    const unauthenticated = pwaDemoReducer(initialPwaDemoState, {
      type: 'navigate',
      section: 'animals',
    });

    expect(unauthenticated).toBe(initialPwaDemoState);
  });
});
