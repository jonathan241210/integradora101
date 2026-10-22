import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { manualInstallController } from '@/tests/testFixtures';
import { AppShell } from '@/views/AppShell';
import {
  initialPwaDemoState,
  pwaDemoReducer,
  pwaSections,
} from '@/viewmodels/pwaDemo';

describe('CA-03 PWA responsive demo screens', () => {
  it('presenta por separado la vista seleccionada en la navegación', () => {
    const signedIn = pwaDemoReducer(initialPwaDemoState, {
      type: 'login',
      username: 'veterinario@demo.local',
      password: 'demo1234',
    });
    const markupBySection = pwaSections.map((section) => {
      const state = pwaDemoReducer(signedIn, {
        type: 'navigate',
        section: section.id,
      });

      return renderToStaticMarkup(
        <AppShell
          activeSection={state.activeSection}
          installController={manualInstallController}
          onLogout={() => undefined}
          onNavigate={() => undefined}
        />,
      );
    });

    expect(markupBySection).toHaveLength(5);
    expect(markupBySection[0]).toContain('Resumen de hoy');
    expect(markupBySection[1]).toContain('Listado ficticio');
    expect(markupBySection[2]).toContain('Nuevo ejemplar');
    expect(markupBySection[3]).toContain('Elige el tipo de diagnóstico');
    expect(markupBySection[4]).toContain('Seguimiento');
    expect(markupBySection[2]).not.toContain('Síntomas observados');
    expect(markupBySection[3]).not.toContain('Descargar PDF');
  });

  it('ofrece navegación con nombres completos para todas las secciones', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        activeSection="home"
        installController={manualInstallController}
        onLogout={() => undefined}
        onNavigate={() => undefined}
      />,
    );

    expect(markup).toContain('aria-label="Navegación principal"');
    for (const section of pwaSections) {
      expect(markup).toContain(`aria-label="${section.label}"`);
    }
  });
});
