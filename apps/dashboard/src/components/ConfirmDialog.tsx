import type { FormEvent, ReactNode } from "react";
import { Alert, Button, Dialog } from "@arca/ui";
import type { ConfirmationCopy } from "@/viewmodels/confirmation";

/**
 * Diálogo de confirmación explícita (RN-03) sobre el `Dialog` de `@arca/ui`
 * (`<dialog>` modal: foco atrapado y cierre con Escape). `idleTitle` mantiene
 * un identificador único mientras está cerrado.
 */
export function ConfirmDialog({
  copy,
  idleTitle,
  busy,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  copy: ConfirmationCopy | null;
  idleTitle: string;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy) onConfirm();
  };

  return (
    <Dialog
      open={copy !== null}
      title={copy?.title ?? idleTitle}
      onClose={onCancel}
      className="confirm-dialog"
    >
      {copy && (
        <form className="dialog-form" onSubmit={submit}>
          <p className="confirm-dialog__message">{copy.message}</p>
          {children}
          {error && (
            <Alert className="dialog-alert" role="alert" aria-live="assertive">
              {error}
            </Alert>
          )}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={onCancel}
            >
              Cancelar
            </Button>
            <Button type="submit" variant={copy.danger ? "danger" : "primary"} disabled={busy}>
              {busy ? "Procesando…" : copy.confirmLabel}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
