import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnimalFormView } from '@/views/AnimalFormView';
import { AppShell } from '@/views/AppShell';
import {
  getNavigationSections,
  initialPwaDemoState,
  pwaDemoReducer,
  pwaSections,
} from '@/viewmodels/pwaDemo';

describe('CA-03 PWA responsive demo screens', () => {
  it('presenta por separado la vista seleccionada en la navegación', () => {
    const signedIn = pwaDemoReducer(initialPwaDemoState, { type: 'authenticated' });
    const markupBySection = pwaSections.map((section) => {
      const state = pwaDemoReducer(signedIn, {
        type: 'navigate',
        section: section.id,
      });

      return renderToStaticMarkup(
        <AppShell
          activeSection={state.activeSection}
          onLogout={() => undefined}
          onNavigate={() => undefined}
          userScope="user:test"
        />,
      );
    });

    expect(markupBySection).toHaveLength(6);
    expect(markupBySection[0]).toContain('Resumen de hoy');
    expect(markupBySection[1]).toContain('Ejemplares registrados');
    expect(markupBySection[2]).toContain('Nuevo ejemplar');
    expect(markupBySection[3]).toContain('Elige el tipo de diagnóstico');
    expect(markupBySection[4]).toContain('Seguimiento');
    expect(markupBySection[5]).toContain('Sincronización');
    expect(markupBySection[2]).not.toContain('Síntomas observados');
    expect(markupBySection[3]).not.toContain('Descargar PDF');
  });

  it('ofrece navegación con nombres completos para todas las secciones', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        activeSection="home"
        onLogout={() => undefined}
        onNavigate={() => undefined}
        userScope="user:test"
      />,
    );

    expect(markup).toContain('aria-label="Navegación principal"');
    expect(markup).not.toContain('topbar-toggle');
    expect(markup).not.toContain('Instalar app');
    for (const section of pwaSections) {
      expect(markup).toContain(`aria-label="${section.label}"`);
    }
  });
});

describe('CA-19 PWA solicitud de publicación: acceso en el menú', () => {
  const label = 'aria-label="Solicitar publicación de especie"';
  const render = (roles?: string[], activeSection: 'home' | 'species-request' = 'home') =>
    renderToStaticMarkup(
      <AppShell
        activeSection={activeSection}
        onLogout={() => undefined}
        onNavigate={() => undefined}
        roles={roles}
      />,
    );

  it('con rol veterinarian el menú incluye el ítem con ícono y etiqueta accesible', () => {
    const markup = render(['veterinarian']);
    expect(markup).toContain(label);
    expect(getNavigationSections(['veterinarian'])).toHaveLength(pwaSections.length + 1);
  });

  it('sin el rol el menú no incluye el ítem', () => {
    expect(render(['zoo-admin'])).not.toContain(label);
    expect(render()).not.toContain(label);
    expect(getNavigationSections([])).toHaveLength(pwaSections.length);
  });

  it('marca el ítem activo cuando la sección es species-request', () => {
    const markup = render(['veterinarian'], 'species-request');
    expect(markup).toMatch(/aria-current="page"[^>]*aria-label="Solicitar publicación de especie"/);
  });
});

describe('CA-03 PWA animal-registration', () => {
  it('requiere seleccionar un recinto antes de permitir el registro', () => {
    const markup = renderToStaticMarkup(<AnimalFormView />);

    expect(markup).toContain('name="animal-enclosure"');
    expect(markup).toContain('required=""');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('Registrar animal');
  });
});

describe('CA-19 PWA solicitud de publicación: menú lateral contraíble', () => {
  const css = readFileSync(fileURLToPath(new URL('../styles.css', import.meta.url)), 'utf8');
  const shell = readFileSync(fileURLToPath(new URL('../views/AppShell.tsx', import.meta.url)), 'utf8');

  it('el menú no queda abierto por :focus-within, solo por :hover o teclado (:focus-visible)', () => {
    expect(css).not.toMatch(/\.desktop-sidebar:focus-within/);
    expect(css).toContain('.desktop-sidebar:has(:focus-visible)');
  });

  it('suelta el foco tras navegar con ratón o toque y vuelve al inicio al cambiar de sección', () => {
    expect(shell).toContain('event.detail > 0');
    expect(shell).toContain('currentTarget.blur()');
    expect(shell).toContain('window.scrollTo');
  });
});
