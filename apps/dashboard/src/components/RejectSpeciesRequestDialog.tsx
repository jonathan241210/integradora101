import { ConfirmDialog } from "./ConfirmDialog";
import { FieldErrors, fieldErrorProps, type FieldErrorMap } from "./FieldErrors";
import type { ConfirmationCopy } from "@/viewmodels/confirmation";
import { REJECTION_REASON_MAX } from "@/viewmodels/species-publication-shared";

/**
 * Diálogo de rechazo sobre `ConfirmDialog`: motivo obligatorio, contador
 * «n/500» y «Confirmar» deshabilitado con el motivo vacío (CA-13). No hay casilla.
 */
export function RejectSpeciesRequestDialog({
  copy,
  reason,
  busy,
  error,
  fieldErrors,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  copy: ConfirmationCopy | null;
  reason: string;
  busy: boolean;
  error: string;
  fieldErrors: FieldErrorMap;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      copy={copy}
      idleTitle="Rechazar solicitud"
      busy={busy}
      confirmDisabled={reason.trim().length === 0}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="arca-field">
        <label className="arca-field__label" htmlFor="species-reject-reason">
          Motivo
        </label>
        <textarea
          id="species-reject-reason"
          className="arca-field__control arca-field__control--textarea"
          rows={4}
          maxLength={REJECTION_REASON_MAX}
          required
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          {...fieldErrorProps("species-reject-reason", fieldErrors, "rejection_reason")}
        />
        <span className="field-counter">
          {reason.length}/{REJECTION_REASON_MAX}
        </span>
        <FieldErrors id="species-reject-reason" errors={fieldErrors} name="rejection_reason" />
      </div>
    </ConfirmDialog>
  );
}
