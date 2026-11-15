import { Button, Card } from '@arca/ui';

export function ReviewFormView({
  onNavigate,
}: {
  onNavigate?: (section: 'diagnosis-intense' | 'diagnosis-quick') => void;
} = {}) {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Seguimiento</p>
        <h2>Registrar revisión</h2>
        <p>
          El seguimiento se registra al guardar un diagnóstico. Elige el formato, complétalo y al
          confirmar el guardado podrás indicar el motivo, estado del animal y próxima revisión.
        </p>
      </div>
      <Card className="form-card">
        <div className="form-actions" style={{ gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button onClick={() => onNavigate?.('diagnosis-intense')} type="button">
            Diagnóstico intenso
          </Button>
          <Button onClick={() => onNavigate?.('diagnosis-quick')} type="button" variant="secondary">
            Diagnóstico rápido
          </Button>
        </div>
      </Card>
    </section>
  );
}
