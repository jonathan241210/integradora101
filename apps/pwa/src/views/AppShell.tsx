import { Button } from '@arca/ui';
import type { ComponentType } from 'react';
import type { PwaInstallController } from '@/viewmodels/usePwaInstall';
import { InstallAppAction } from '@/views/InstallAppAction';
import {
  getSectionLabel,
  isNavigationActive,
  pwaSections,
  type PwaSection,
} from '@/viewmodels/pwaDemo';
import { AnimalFormView } from '@/views/AnimalFormView';
import { AnimalsView } from '@/views/AnimalsView';
import { DiagnosisChooserView } from '@/views/DiagnosisChooserView';
import { DiagnosisIntenseView } from '@/views/DiagnosisIntenseView';
import { DiagnosisQuickView } from '@/views/DiagnosisQuickView';
import { HomeView } from '@/views/HomeView';
import { ReviewFormView } from '@/views/ReviewFormView';

type AppShellProps = {
  activeSection: PwaSection;
  installController: PwaInstallController;
  onNavigate: (section: PwaSection) => void;
  onLogout: () => void;
};

type ActiveViewProps = {
  onNavigate: (section: PwaSection) => void;
};

const sectionViews: Record<PwaSection, ComponentType<ActiveViewProps>> = {
  home: HomeView,
  animals: AnimalsView,
  'animal-form': AnimalFormView,
  'diagnosis-form': DiagnosisChooserView,
  'diagnosis-intense': DiagnosisIntenseView,
  'diagnosis-quick': DiagnosisQuickView,
  'review-form': ReviewFormView,
};

export function AppShell({
  activeSection,
  installController,
  onNavigate,
  onLogout,
}: AppShellProps) {
  const ActiveView = sectionViews[activeSection];
  const currentLabel = getSectionLabel(activeSection);

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar" aria-label="Navegación principal">
        <a
        className="sidebar-brand"
        href="#inicio"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('home');
        }}
        >
          <span className="brand-mark" aria-hidden="true">
            🐾
          </span>
          <span>ZooHealth</span>
        </a>

        <p className="sidebar-caption">Espacio veterinario</p>
        <Navigation
          activeSection={activeSection}
          onNavigate={onNavigate}
          variant="desktop"
        />

        <div className="sidebar-bottom">
          <span className="demo-user">
            <span className="demo-user-avatar" aria-hidden="true">V</span>
            <span>
              <strong>Veterinario</strong>
              <small>Cuenta de demostración</small>
            </span>
          </span>
          <Button onClick={onLogout} variant="ghost">
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <p>ZooHealth <span aria-hidden="true">/</span> Módulo veterinario</p>
            <h1>{currentLabel}</h1>
          </div>
          <div className="topbar-actions">
            <InstallAppAction controller={installController} />
            <span className="demo-pill">Modo demostración</span>
          </div>
        </header>

        <div className="demo-banner" role="note">
          Demostración: no autentica ni protege información. Los formularios no
          guardan datos.
        </div>

        <main className="view-content" key={activeSection}>
          <ActiveView onNavigate={onNavigate} />
        </main>

        <div className="mobile-logout">
          <Button onClick={onLogout} variant="ghost">
            Cerrar sesión
          </Button>
        </div>
      </div>

      <nav className="mobile-navigation" aria-label="Navegación principal">
        <Navigation
          activeSection={activeSection}
          onNavigate={onNavigate}
          variant="mobile"
        />
      </nav>
    </div>
  );
}

function Navigation({
  activeSection,
  onNavigate,
  variant,
}: {
  activeSection: PwaSection;
  onNavigate: (section: PwaSection) => void;
  variant: 'desktop' | 'mobile';
}) {
  return (
    <div className={`navigation navigation-${variant}`}>
      {pwaSections.map((section) => (
        <button
          aria-current={isNavigationActive(section.id, activeSection) ? 'page' : undefined}
          aria-label={section.label}
          className={`navigation-item ${
            isNavigationActive(section.id, activeSection) ? 'is-active' : ''
          }`}
          key={section.id}
          onClick={() => onNavigate(section.id)}
          type="button"
        >
          <span className="navigation-symbol" aria-hidden="true">
            {section.symbol}
          </span>
          <span className="navigation-label">
            {variant === 'mobile' ? section.shortLabel : section.label}
          </span>
        </button>
      ))}
    </div>
  );
}
