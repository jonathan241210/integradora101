import { Button } from '@arca/ui';
import { useState, type ComponentType } from 'react';
import {
  getSectionLabel,
  isNavigationActive,
  pwaSections,
  type PwaSection,
} from '@/viewmodels/pwaDemo';
import { Icon } from '@/components/Icon';
import { AnimalFormView } from '@/views/AnimalFormView';
import { AnimalProfileView } from '@/views/AnimalProfileView';
import { AnimalsView } from '@/views/AnimalsView';
import { DiagnosisChooserView } from '@/views/DiagnosisChooserView';
import { DiagnosisIntenseView } from '@/views/DiagnosisIntenseView';
import { DiagnosisQuickView } from '@/views/DiagnosisQuickView';
import { HomeView } from '@/views/HomeView';
import { ReviewFormView } from '@/views/ReviewFormView';
import { SpeciesRequestView } from '@/views/SpeciesRequestView';

type AppShellProps = {
  activeSection: PwaSection;
  onNavigate: (section: PwaSection) => void;
  onLogout: () => void;
  sessionError?: string;
  signingOut?: boolean;
  mvzName?: string;
  roles?: readonly string[];
};

type ActiveViewProps = {
  animalId: number | null;
  onNavigate: (section: PwaSection) => void;
  onOpenAnimal: (animalId: number) => void;
  mvzName?: string;
  roles?: readonly string[];
};

const sectionViews: Record<PwaSection, ComponentType<ActiveViewProps>> = {
  home: ({ onNavigate, roles }) => <HomeView onNavigate={onNavigate} roles={roles} />,
  animals: AnimalsView,
  'animal-profile': ({ animalId, onNavigate }) => (
    <AnimalProfileView animalId={animalId} onBack={() => onNavigate('animals')} />
  ),
  'animal-form': AnimalFormView,
  'diagnosis-form': DiagnosisChooserView,
  'diagnosis-intense': ({ mvzName }) => <DiagnosisIntenseView mvzName={mvzName} />,
  'diagnosis-quick': ({ mvzName }) => <DiagnosisQuickView mvzName={mvzName} />,
  'review-form': ({ onNavigate }) => <ReviewFormView onNavigate={onNavigate} />,
  'species-request': () => <SpeciesRequestView />,
};

export function AppShell({
  activeSection,
  onNavigate,
  onLogout,
  sessionError,
  signingOut,
  mvzName,
  roles,
}: AppShellProps) {
  const ActiveView = sectionViews[activeSection];
  const currentLabel = getSectionLabel(activeSection);
  const [animalId, setAnimalId] = useState<number | null>(null);

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
            <Icon name="paw" size={24} />
          </span>
          <span className="sidebar-brand-label">ZooHealth</span>
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
              <small>Sesión activa</small>
            </span>
          </span>
          <Button className="sidebar-logout" disabled={signingOut} onClick={onLogout} variant="ghost" aria-label="Cerrar sesión">
            <Icon name="logout" size={20} aria-hidden />
            <span>Cerrar sesión</span>
          </Button>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <p>ZooHealth <span aria-hidden="true">/</span> Módulo veterinario</p>
            <h1>{currentLabel}</h1>
          </div>
        </header>

        <main className="view-content" key={activeSection}>
          {sessionError && <p role="alert">{sessionError}</p>}
          <ActiveView
            animalId={animalId}
            onNavigate={onNavigate}
            onOpenAnimal={(id) => {
              setAnimalId(id);
              onNavigate('animal-profile');
            }}
            mvzName={mvzName}
            roles={roles}
          />
        </main>

        <div className="mobile-logout">
          <Button disabled={signingOut} onClick={onLogout} variant="ghost">
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
  const iconMap: Record<string, string> = {
    home: 'home',
    animals: 'animals',
    'animal-profile': 'animals',
    'animal-form': 'camera',
    'diagnosis-form': 'diagnosis',
    'diagnosis-intense': 'intense',
    'diagnosis-quick': 'quick',
    'review-form': 'review',
  };

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
            <Icon name={iconMap[section.id] || 'home'} size={20} />
          </span>
          <span className="navigation-label">
            {variant === 'mobile' ? section.shortLabel : section.label}
          </span>
        </button>
      ))}
    </div>
  );
}
