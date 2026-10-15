import { Alert, Button, Card } from '@arca/ui';
import type { PwaSection } from '@/viewmodels/pwaDemo';

const modes: {
  section: PwaSection;
  title: string;
  description: string;
  symbol: string;
}[] = [
  {
    section: 'diagnosis-intense',
    title: 'Diagnóstico intenso',
    description:
      'Historia clínica del ejemplar y evaluación clínica completa con sinología.',
    symbol: '✚',
  },
  {
    section: 'diagnosis-quick',
    title: 'Diagnóstico rápido',
    description: 'Formato de historia clínica con casillas por sistema.',
    symbol: '⚡',
  },
];

export function DiagnosisChooserView({
  onNavigate,
}: {
  onNavigate: (section: PwaSection) => void;
}) {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Atención veterinaria</p>
        <h2>Elige el tipo de diagnóstico</h2>
        <p>Cada diagnóstico se puede descargar como PDF.</p>
      </div>
      <Alert className="form-demo-note" role="note">
        Demostración: el diagnóstico no se guarda ni se envía.
      </Alert>
      <div className="shortcut-grid">
        {modes.map((mode) => (
          <Card className="shortcut-card" key={mode.section}>
            <span className="shortcut-icon" aria-hidden="true">
              {mode.symbol}
            </span>
            <h3>{mode.title}</h3>
            <p>{mode.description}</p>
            <Button onClick={() => onNavigate(mode.section)} variant="secondary">
              Abrir {mode.title.toLocaleLowerCase()}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
