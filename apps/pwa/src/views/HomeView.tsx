import { Button, Card } from '@arca/ui';
import { Icon } from '@/components/Icon';
import type { PwaSection } from '@/viewmodels/pwaDemo';

const shortcuts: {
  title: string;
  description: string;
  section: PwaSection;
  icon: string;
}[] = [
  {
    title: 'Registrar animal',
    description: 'Dar de alta un nuevo ejemplar',
    section: 'animal-form',
    icon: 'camera',
  },
  {
    title: 'Diagnóstico intenso',
    description: 'Historia y evaluación clínica completas',
    section: 'diagnosis-intense',
    icon: 'intense',
  },
  {
    title: 'Diagnóstico rápido',
    description: 'Formato con casillas por sistema',
    section: 'diagnosis-quick',
    icon: 'quick',
  },
  {
    title: 'Registrar revisión',
    description: 'Registrar seguimiento desde los formatos de diagnóstico',
    section: 'review-form',
    icon: 'review',
  },
];

export function HomeView({
  onNavigate,
}: {
  onNavigate: (section: PwaSection) => void;
  animalId?: number | null;
  onOpenAnimal?: unknown;
  mvzName?: string;
  userScope?: string;
}) {
  return (
    <div className="home-view">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">Resumen de hoy</p>
          <h2>¡Hola, equipo veterinario!</h2>
          <p>Consulta y recorre las herramientas del módulo veterinario.</p>
        </div>
        <span className="welcome-icon" aria-hidden="true">
          <Icon name="paw" size={40} />
        </span>
      </section>

      <section className="quick-actions" aria-labelledby="quick-actions-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Accesos directos</p>
            <h2 id="quick-actions-title">¿Qué deseas hacer?</h2>
          </div>
        </div>
        <div className="shortcut-grid">
          {shortcuts.map((shortcut) => (
            <Card className="shortcut-card" key={shortcut.section}>
              <span className="shortcut-icon" aria-hidden="true">
                <Icon name={shortcut.icon} size={32} />
              </span>
              <h3>{shortcut.title}</h3>
              <p>{shortcut.description}</p>
              <Button
                onClick={() => onNavigate(shortcut.section)}
                variant="secondary"
              >
                Abrir
              </Button>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
