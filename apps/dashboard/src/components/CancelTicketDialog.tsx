import type { FormEvent } from "react";
import { Alert, Button, Dialog, TextAreaField } from "@arca/ui";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import type { TicketHistoryState } from "@/viewmodels/ticket-history";

/**
 * Cancelación con motivo obligatorio (dashboard-005 CA-12, RN-03). Un 422 de
 * la API se muestra aquí mismo.
 */
export function CancelTicketDialog({
  cancel,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  cancel: TicketHistoryState["cancel"];
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { target } = cancel;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cancel.busy) onConfirm();
  };

  return (
    <Dialog
      open={target !== null}
      title="Cancelar boleto"
      onClose={onClose}
      className="form-dialog"
    >
      {target && (
        <form className="dialog-form" onSubmit={submit}>
          <p className="confirm-dialog__message">
            Vas a cancelar el boleto con folio {target.folio}. Indica el motivo.
          </p>
          <TextAreaField
            id="cancel-reason"
            label="Motivo"
            aria-required="true"
            maxLength={255}
            rows={3}
            value={cancel.reason}
            onChange={(event) => onReasonChange(event.target.value)}
            {...fieldErrorProps("cancel-reason", cancel.fieldErrors, "reason")}
          />
          <FieldErrors id="cancel-reason" errors={cancel.fieldErrors} name="reason" />
          {cancel.error && (
            <Alert className="dialog-alert" role="alert" aria-live="assertive">
              {cancel.error}
            </Alert>
          )}
          <div className="dialog-actions">
            <Button type="button" variant="secondary" disabled={cancel.busy} onClick={onClose}>
              Volver
            </Button>
            <Button type="submit" variant="danger" disabled={cancel.busy}>
              {cancel.busy ? "Cancelando…" : "Cancelar boleto"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
