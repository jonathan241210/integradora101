import type { ReactNode } from "react";
import { ConfirmDialog as SharedConfirmDialog } from "@arca/ui";
import { ActionError } from "./DashboardNotifications";
import type { ConfirmationCopy } from "@/viewmodels/confirmation";

/**
 * Envoltorio delgado del `ConfirmDialog` de `@arca/ui` (dashboard-020 rev. (d)):
 * conserva el ancho propio del dashboard (`confirm-dialog`) y presenta el error
 * con `ActionError` (regla de mensajes), que es lo único que depende de la app.
 */
export function ConfirmDialog({
  copy,
  idleTitle,
  busy,
  confirmDisabled = false,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  copy: ConfirmationCopy | null;
  idleTitle: string;
  busy: boolean;
  /** Deshabilita solo «Confirmar» (p. ej. mientras se cotiza). */
  confirmDisabled?: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <SharedConfirmDialog
      copy={copy}
      idleTitle={idleTitle}
      busy={busy}
      confirmDisabled={confirmDisabled}
      error={<ActionError message={error} inDialog />}
      onConfirm={onConfirm}
      onCancel={onCancel}
      className="confirm-dialog"
    >
      {children}
    </SharedConfirmDialog>
  );
}
