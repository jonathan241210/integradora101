import { Button } from "@arca/ui";
import { FieldErrors, type FieldErrorMap } from "@/components/FieldErrors";
import type { ReportExportFormat } from "@/viewmodels/admin-types";
import {
  exportButtonLabel,
  isExportDisabled,
  reportExportOptions,
} from "@/viewmodels/report-export";

/**
 * Grupo de exportación compartido por Boletos y Cancelaciones (dashboard-020 CA-13, CA-14).
 * Los 422 de formato o de tope de filas se muestran junto al grupo; los fallos de red o 5xx
 * los publica la vista como aviso emergente (RN-07).
 */
export function ReportExportButtons({
  exporting,
  fieldErrors = {},
  disabled = false,
  note,
  onExport,
}: {
  exporting: ReportExportFormat | null;
  fieldErrors?: FieldErrorMap;
  disabled?: boolean;
  /** Aviso opcional junto al grupo, p. ej. los filtros con los que se exportará. */
  note?: string;
  onExport: (format: ReportExportFormat) => void;
}) {
  const messages = Object.values(fieldErrors)
    .flat()
    .filter(Boolean);

  return (
    <>
      <div className="report-export" role="group" aria-label="Exportar reporte">
        {reportExportOptions.map((option) => (
          <Button
            variant="secondary"
            key={option.format}
            disabled={isExportDisabled(exporting, disabled)}
            aria-describedby={messages.length > 0 ? "report-export-error" : undefined}
            onClick={() => onExport(option.format)}
          >
            {exportButtonLabel(option, exporting)}
          </Button>
        ))}
      </div>
      {note && (
        <p className="report-export-note" role="note">
          {note}
        </p>
      )}
      <FieldErrors id="report-export" errors={{ export: messages }} name="export" />
    </>
  );
}
