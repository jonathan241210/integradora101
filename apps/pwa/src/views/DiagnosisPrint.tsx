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

export function PrintActions({ children }: { children?: ReactNode }) {
  const { error, print } = usePrintDocument();

  return (
    <>
      {error && <Alert role="alert">{error}</Alert>}
      <div className="form-actions no-print">
        {children}
        <Button onClick={print} type="button">
          Descargar PDF
        </Button>
      </div>
    </>
  );
}
