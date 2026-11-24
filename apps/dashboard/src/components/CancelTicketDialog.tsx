import type { FormEvent } from "react";
import { Alert, Button, Dialog, SelectField, TextAreaField } from "@arca/ui";
import { ActionError } from "./DashboardNotifications";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import type { CancellationReasonsViewModel } from "@/viewmodels/cancellation-reasons";
import { commentRequiredFor } from "@/viewmodels/cancellation-reasons";
import type { TicketHistoryState } from "@/viewmodels/ticket-history";

/**
 * Cancelación con motivo de lista obligatorio (dashboard-005 CA-12, RN-03; dashboard-016
 * CA-18 a CA-21). Las opciones y la política de comentario vienen de la API. Un 422 de la API
 * se muestra aquí mismo.
 */
export function CancelTicketDialog({
  cancel,
  reasons,
  onReasonCodeChange,
  onReasonChange,
  onConfirm,
  onClose,
}: {
  cancel: TicketHistoryState["cancel"];
  reasons?: CancellationReasonsViewModel;
  onReasonCodeChange: (reasonCode: string) => void;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { target } = cancel;
  const catalog = reasons?.state;
  const options = catalog?.reasons ?? [];
  const commentRequired = commentRequiredFor(options, cancel.reasonCode);
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
            Vas a cancelar el boleto con folio {target.folio}. Elige el motivo.
          </p>
          {catalog?.status === "error" && (
            <div className="state-message state-message--error">
              <Alert role="alert">{catalog.error}</Alert>
              <Button type="button" variant="secondary" onClick={reasons?.reload}>
                Reintentar
              </Button>
            </div>
          )}
          <SelectField
            id="cancel-reason-code"
            label="Motivo"
            aria-required="true"
            value={cancel.reasonCode}
            disabled={cancel.busy || !catalog || catalog.status === "loading"}
            onChange={(event) => onReasonCodeChange(event.target.value)}
            {...fieldErrorProps("cancel-reason-code", cancel.fieldErrors, "reason_code")}
          >
            <option value="">
              {catalog?.status === "loading" ? "Cargando motivos…" : "Elige un motivo"}
            </option>
            {options.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <FieldErrors id="cancel-reason-code" errors={cancel.fieldErrors} name="reason_code" />
          <TextAreaField
            id="cancel-reason"
            label={commentRequired ? "Describe el motivo" : "Comentario (opcional)"}
            aria-required={commentRequired ? "true" : undefined}
            maxLength={255}
            rows={3}
            value={cancel.reason}
            onChange={(event) => onReasonChange(event.target.value)}
            {...fieldErrorProps("cancel-reason", cancel.fieldErrors, "reason")}
          />
          <FieldErrors id="cancel-reason" errors={cancel.fieldErrors} name="reason" />
          <ActionError message={cancel.error} inDialog />
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
