import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { manualInstallController } from '@/tests/testFixtures';
import { LoginView } from '@/views/LoginView';
import { AppShell } from '@/views/AppShell';

const styles = readFileSync(
  fileURLToPath(new URL('../styles.css', import.meta.url)),
  'utf8',
);

describe('CA-05 PWA responsive demo screens', () => {
  it('asocia nombres a los campos y anuncia errores del login', () => {
    const loginMarkup = renderToStaticMarkup(
      <LoginView
        error="El usuario o la contraseña no son correctos."
        installController={manualInstallController}
        onLogin={() => undefined}
      />,
    );

    expect(loginMarkup).toContain('for="demo-username"');
    expect(loginMarkup).toContain('id="demo-username"');
    expect(loginMarkup).toContain('for="demo-password"');
    expect(loginMarkup).toContain('id="demo-password"');
    expect(loginMarkup).toContain('role="alert"');
    expect(loginMarkup).toContain('aria-label="ZooHealth"');
  });

  it('nombra la navegación y marca la sección activa', () => {
    const appMarkup = renderToStaticMarkup(
      <AppShell
        activeSection="home"
        installController={manualInstallController}
        onLogout={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(appMarkup).toContain('aria-current="page"');
    expect(appMarkup).toContain('aria-label="Navegación principal"');
  });

  it('define un indicador de foco visible y respeta movimiento reducido', () => {
    expect(styles).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid var\(--ring\)/s);
    expect(styles).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
  });
});
