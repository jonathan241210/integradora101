import type { ReportExportFormat } from "./admin-types";

/** Formatos de exportación compartidos por las pestañas de reportes (dashboard-020 CA-13). */
export const reportExportOptions: { format: ReportExportFormat; label: string }[] = [
  { format: "csv", label: "Exportar CSV" },
  { format: "xlsx", label: "Exportar Excel" },
  { format: "pdf", label: "Exportar PDF" },
];

export const EXPORTING_LABEL = "Descargando…";

/** El botón del formato activo muestra «Descargando…» (CA-14). */
export function exportButtonLabel(
  option: { format: ReportExportFormat; label: string },
  exporting: ReportExportFormat | null,
): string {
  return exporting === option.format ? EXPORTING_LABEL : option.label;
}

/** Mientras hay una exportación en curso, el grupo completo se deshabilita (CA-14). */
export function isExportDisabled(exporting: ReportExportFormat | null, blocked = false): boolean {
  return exporting !== null || blocked;
}
