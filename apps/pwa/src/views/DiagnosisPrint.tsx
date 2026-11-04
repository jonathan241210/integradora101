import { Alert, Button } from '@arca/ui';
import { type ReactNode, useState } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { institution, usePrintDocument } from '@/viewmodels/diagnosisForms';
import { formToRecord } from '@/viewmodels/useApiData';
import { exportSheetPdf } from '@/viewmodels/pdfExport';
import { IntensePrintSheet, QuickPrintSheet, type SheetValues } from '@/views/PrintSheets';
import { Spinner } from '@/views/Spinner';

export function PrintHeader() {
  return (
    <header className="print-header">
      <img
        alt=""
        className="print-logo"
        onError={(event) => {
          event.currentTarget.style.display = 'none';
        }}
        src="/logo-zoologico.jpeg"
      />
      <div>
        <p>{institution.name}</p>
        <p>{institution.department}</p>
        <p>{institution.title}</p>
      </div>
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
  const [values, setValues] = useState<SheetValues | null>(null);

  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const printSheet = async () => {
    const form = formId ? (document.getElementById(formId) as HTMLFormElement | null) : null;
    if (!form) {
      print();
      return;
    }
    flushSync(() => setValues(formToRecord(form)));
    const sheet = document.querySelector<HTMLElement>('body > .print-sheet');
    if (!sheet) return;
    setPdfBusy(true);
    setPdfError('');
    try {
      await exportSheetPdf(sheet, `${formId === 'quick-form' ? 'diagnostico-rapido' : 'diagnostico-intenso'}.pdf`);
    } catch {
      setPdfError('No se pudo generar el PDF. Inténtalo de nuevo.');
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      {values && formId === 'quick-form' && createPortal(<QuickPrintSheet values={values} />, document.body)}
      {values && formId === 'intense-form' && createPortal(<IntensePrintSheet values={values} />, document.body)}
      {(error || pdfError) && <Alert role="alert">{error || pdfError}</Alert>}
      <div className="form-actions no-print">
        {children}
        {formId && (
          <Button disabled={saving} form={formId} type="submit">
            {saving ? <Spinner label="Cargando…" /> : 'Guardar diagnóstico'}
          </Button>
        )}
        <Button disabled={pdfBusy} onClick={printSheet} type="button" variant="secondary">
          {pdfBusy ? <Spinner label="Cargando…" /> : 'Descargar PDF'}
        </Button>
      </div>
    </>
  );
}

