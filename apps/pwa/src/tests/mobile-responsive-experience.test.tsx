import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AppShell } from '@/views/AppShell';
import { DiagnosisIntenseView } from '@/views/DiagnosisIntenseView';
import { DiagnosisQuickView } from '@/views/DiagnosisQuickView';
import { HomeView } from '@/views/HomeView';
import { ReviewFormView } from '@/views/ReviewFormView';
import { ToastCenter } from '@/views/ToastCenter';
import { Icon } from '@/components/Icon';

const read = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

const styles = read('../styles.css');
const indexHtml = read('../../index.html');
const animalProfileSource = read('../views/AnimalProfileView.tsx');
const syncStatusSource = read('../views/SyncStatusView.tsx');

describe('pwa-015 · adaptación móvil integral', () => {
  it('CA-01 mantiene 6–7 secciones en una fila horizontal y ubica «Cerrar sesión» móvil en .topbar', () => {
    const markup = renderToStaticMarkup(
      <AppShell
        activeSection="home"
        onLogout={() => undefined}
        onNavigate={() => undefined}
        roles={['veterinarian']}
        userScope="user:test"
      />,
    );

    expect(markup).toContain('class="mobile-topbar-logout no-print"');
    expect(markup).not.toContain('class="mobile-logout"');
    expect(markup).toContain('aria-label="Cerrar sesión"');
    expect(markup).toContain('aria-label="Solicitar publicación de especie"');
    expect(markup).toContain('aria-label="Sync"');

    expect(styles).toMatch(
      /\.navigation-mobile:has\(> :nth-child\(6\)\)\s*\{[^}]*display:\s*flex[^}]*flex-wrap:\s*nowrap[^}]*overflow-x:\s*auto/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.mobile-topbar-logout\s*\{[^}]*display:\s*flex/s,
    );
  });

  it('CA-02 ubica los avisos flotantes arriba en móvil sin tapar la barra inferior', () => {
    const toastMarkup = renderToStaticMarkup(<ToastCenter />);
    expect(toastMarkup).toContain('class="sync-notices no-print"');
    expect(toastMarkup).toContain('aria-live="polite"');

    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.sync-notices\s*\{[^}]*inset-block-start:\s*max\(12px,\s*env\(safe-area-inset-top\)\)[^}]*inset-block-end:\s*auto/s,
    );
  });

  it('CA-03 adapta el perfil del animal, historial clínico y contención química a vista apilada móvil', () => {
    expect(animalProfileSource).toContain('className="profile-hero-actions"');
    expect(animalProfileSource).toContain('className="profile-row-actions"');
    expect(animalProfileSource).toContain('className="profile-table responsive-table profile-history-table"');
    expect(animalProfileSource).toContain('className="profile-evaluation-row"');
    expect(animalProfileSource).toContain('className="profile-evaluation-cell"');
    expect(animalProfileSource).toContain('data-label="Medicamento"');
    expect(animalProfileSource).toContain('data-label="Motivo / diagnóstico"');
    expect(animalProfileSource).toContain('data-label="Acciones"');

    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.responsive-table tbody td::before\s*\{[^}]*content:\s*attr\(data-label\)/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.responsive-table tbody td\.profile-evaluation-cell::before\s*\{[^}]*display:\s*none/s,
    );
  });

  it('CA-04 adapta la cabecera y la cola de sincronización en SyncStatusView para móvil', () => {
    expect(syncStatusSource).toContain('className="sync-toolbar"');
    expect(syncStatusSource).not.toContain('className="form-actions"');
    expect(syncStatusSource).toContain('className="profile-table responsive-table"');
    for (const label of ['Tipo', 'Referencia', 'Fecha', 'Estado', 'Intentos', 'Último resultado']) {
      expect(syncStatusSource).toContain(`data-label="${label}"`);
    }

    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.sync-toolbar\s*\{[^}]*display:\s*grid/s,
    );
  });

  it('CA-05 adapta formularios clínicos, contención química sin duplicar inputs, firma y áreas táctiles', () => {
    const intenseMarkup = renderToStaticMarkup(<DiagnosisIntenseView userScope="user:test" />);
    expect(intenseMarkup).toContain('restraint-edit-table');
    expect(intenseMarkup).toContain('data-row-label="Aplicación 1"');
    expect(intenseMarkup).toContain('data-label="Medicamento"');
    expect(intenseMarkup.match(/name="intense-restraint-1-medication"/g)).toHaveLength(1);

    const quickMarkup = renderToStaticMarkup(<DiagnosisQuickView userScope="user:test" />);
    expect(quickMarkup).toContain('print-signature__line');
    expect(quickMarkup).not.toContain('______________________');

    const reviewMarkup = renderToStaticMarkup(<ReviewFormView />);
    expect(reviewMarkup).toContain('class="review-actions"');
    expect(reviewMarkup).not.toContain('class="form-actions"');

    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.restraint-edit-table \.table-input\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.check-group label\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 760px\)[\s\S]*?\.clear-image-btn\s*\{[^}]*width:\s*40px[^}]*height:\s*40px/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.form-actions\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/s,
    );
  });

  it('CA-06 adapta listado de animales, paginación, selector segmentado y diálogos en móvil estrecho', () => {
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.animal-row-button\s*\{[^}]*grid-template-columns:\s*36px minmax\(0,\s*1fr\)/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.animals-card \.pagination-bar\s*\{[^}]*display:\s*grid/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.segmented\s*\{[^}]*width:\s*100%/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.segmented__item\s*\{[^}]*min-height:\s*44px/s,
    );
    expect(styles).toMatch(
      /@media screen and \(max-width: 520px\)[\s\S]*?\.arca-dialog\s*\{[^}]*padding:\s*18px/s,
    );
  });

  it('CA-07 habilita viewport-fit=cover y evita overflow-x oculto en raíz', () => {
    expect(indexHtml).toContain('viewport-fit=cover');
    expect(styles).not.toMatch(
      /(?:^|})\s*(?:html|body|#root)\s*\{[^}]*overflow-x:\s*(?:hidden|clip)/s,
    );
  });

  it('CA-08 usa una huella reconocible para Animales/marca y un icono diferenciado de catálogo para Especies', () => {
    const animalsIcon = renderToStaticMarkup(<Icon name="animals" />);
    const speciesIcon = renderToStaticMarkup(<Icon name="species" />);
    expect(animalsIcon.match(/<circle /g)).toHaveLength(4);
    expect(animalsIcon).toContain('<path ');
    expect(speciesIcon).toContain('icon-species');
    expect(speciesIcon).not.toBe(animalsIcon);

    const shellMarkup = renderToStaticMarkup(
      <AppShell
        activeSection="home"
        onLogout={() => undefined}
        onNavigate={() => undefined}
        roles={['veterinarian']}
        userScope="user:test"
      />,
    );
    expect(shellMarkup).toContain('icon-animals');
    expect(shellMarkup).toContain('icon-species');

    const homeMarkup = renderToStaticMarkup(
      <HomeView onNavigate={() => undefined} roles={['veterinarian']} />,
    );
    expect(homeMarkup).toContain('icon-species');
  });
});
