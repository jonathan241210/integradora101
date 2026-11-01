import { Alert, Button } from '@arca/ui';
import type { ReactNode } from 'react';
import { institution, usePrintDocument } from '@/viewmodels/diagnosisForms';

export function PrintHeader() {
  return (
    <header className="print-header">
      <p>{institution.name}</p>
      <p>{institution.department}</p>
      <p>{institution.title}</p>
    </header>
  );
}

export function PrintFooter() {
  return <footer className="print-footer">{institution.address}</footer>;
}

export function PrintActions({
  children,
  formId,
  saving = false,
}: {
  children?: ReactNode;
  formId?: string;
  saving?: boolean;
}) {
  const { error, print } = usePrintDocument();

  return (
    <>
      {error && <Alert role="alert">{error}</Alert>}
      <div className="form-actions no-print">
        {children}
        {formId && (
          <Button disabled={saving} form={formId} type="submit">
            {saving ? 'Guardando…' : 'Guardar diagnóstico'}
          </Button>
        )}
        <Button onClick={print} type="button" variant="secondary">
          Descargar PDF
        </Button>
      </div>
    </>
  );
}
