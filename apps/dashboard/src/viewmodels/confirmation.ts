/** Texto de un diálogo de confirmación (RN-03). */
export type ConfirmationCopy = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
};

/**
 * Texto de un diálogo a partir del texto de una acción de lista (dashboard-020,
 * revisión 2026-11-21 (b)). El título es el nombre accesible que ya tenía la
 * confirmación en línea; mensaje, botón y énfasis no cambian.
 */
export function confirmationFromCopy(
  copy: { label: string; message: string; confirmLabel: string; danger: boolean } | null,
  title?: string,
): ConfirmationCopy | null {
  if (!copy) return null;

  return { title: title ?? copy.label, message: copy.message, confirmLabel: copy.confirmLabel, danger: copy.danger };
}
