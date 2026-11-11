import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LoginView } from '@/views/LoginView';
import {
  initialPwaDemoState,
  pwaDemoReducer,
} from '@/viewmodels/pwaDemo';

describe('CA-01 PWA login', () => {
  it('muestra campos etiquetados y acceso con cuenta del personal', () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error=""
        onLogin={() => undefined}
      />,
    );

    expect(markup).toContain('Iniciar sesión');
    expect(markup).toContain('Correo electrónico');
    expect(markup).toContain('Contraseña');
    expect(markup).not.toContain('Modo demostración');
    expect(markup).toContain('type="password"');
  });
});

describe('CA-02 PWA sesión', () => {
  it('abre la sesión solo tras autenticarse y la cierra en memoria', () => {
    const signedIn = pwaDemoReducer(initialPwaDemoState, { type: 'authenticated' });
    const signedOut = pwaDemoReducer(signedIn, { type: 'logout' });

    expect(signedIn.isLoggedIn).toBe(true);
    expect(signedIn.activeSection).toBe('home');
    expect(signedOut).toEqual(initialPwaDemoState);
  });

  it('muestra el error recibido del servidor', () => {
    const markup = renderToStaticMarkup(
      <LoginView
        error="Credenciales incorrectas."
        onLogin={() => undefined}
      />,
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Credenciales incorrectas.');
  });

  it('no permite cambiar de sección cuando no existe una sesión de demo', () => {
    const unauthenticated = pwaDemoReducer(initialPwaDemoState, {
      type: 'navigate',
      section: 'animals',
    });

    expect(unauthenticated).toBe(initialPwaDemoState);
  });
});
