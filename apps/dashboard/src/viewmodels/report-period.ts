import type { ReportPeriodType } from "./admin-types";

/** Periodos compartidos por Boletos y Cancelaciones (dashboard-020 CA-15, D-5). */
export const reportPeriodOptions: { value: ReportPeriodType; label: string }[] = [
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensual" },
  { value: "custom", label: "Rango personalizado" },
];

/** Valor por defecto del selector; la fecha de hoy la resuelve la API. */
export const defaultReportPeriod: ReportPeriodType = "week";

/** Nombres de campo 422 que se muestran junto al selector de periodo. */
export const periodFieldNames = ["period", "date", "from", "to"] as const;

/** Mensajes 422 de periodo, sin mezclar los de otros filtros. */
export function periodFieldErrors(errors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(errors).filter(([name]) => (periodFieldNames as readonly string[]).includes(name)),
  );
}

/** Mensajes 422 que no son de periodo (cajero, motivo, etc.). */
export function otherFieldErrors(errors: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(errors).filter(([name]) => !(periodFieldNames as readonly string[]).includes(name)),
  );
}
