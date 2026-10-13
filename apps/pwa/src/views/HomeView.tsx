import { Badge, Button, Card } from '@arca/ui';
import type { PwaSection } from '@/viewmodels/pwaDemo';

const activities = [
  { name: 'Luna', detail: 'Lobo mexicano · Revisión registrada', time: 'Hace 2 h', tone: 'success' as const },
  { name: 'Cuahtli', detail: 'Águila real · Diagnóstico registrado', time: 'Hace 5 h', tone: 'warning' as const },
  { name: 'Chuy', detail: 'Tapir de Baird · Revisión registrada', time: 'Ayer', tone: 'neutral' as const },
];

const shortcuts: {
  title: string;
  description: string;
  section: PwaSection;
  symbol: string;
}[] = [
  {
    title: 'Registrar animal',
    description: 'Dar de alta un nuevo ejemplar',
    section: 'animal-form',
    symbol: '+',
  },
  {
    title: 'Registrar diagnóstico',
    description: 'Anotar síntomas observados',
    section: 'diagnosis-form',
    symbol: '✚',
  },
  {
    title: 'Registrar revisión',
    description: 'Capturar control y seguimiento',
    section: 'review-form',
    symbol: '◷',
  },
];

export function HomeView({
  onNavigate,
}: {
  onNavigate: (section: PwaSection) => void;
}) {
  return (
    <div className="home-view">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">Resumen de hoy</p>
          <h2>¡Hola, equipo veterinario!</h2>
          <p>Consulta y recorre las herramientas del módulo veterinario.</p>
        </div>
        <span className="welcome-icon" aria-hidden="true">🐾</span>
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
                {shortcut.symbol}
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

      <section className="activity-section" aria-labelledby="activity-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Actividad reciente</p>
            <h2 id="activity-title">Últimos movimientos de muestra</h2>
          </div>
          <Button
            onClick={() => onNavigate('animals')}
            variant="ghost"
          >
            Ver animales
          </Button>
        </div>
        <Card className="activity-card">
          {activities.map((activity) => (
            <div className="activity-row" key={activity.name}>
              <span className="animal-avatar" aria-hidden="true">
                {activity.name.slice(0, 1)}
              </span>
              <div className="activity-description">
                <strong>{activity.name}</strong>
                <span>{activity.detail}</span>
              </div>
              <div className="activity-meta">
                <Badge tone={activity.tone}>Muestra</Badge>
                <small>{activity.time}</small>
              </div>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}
