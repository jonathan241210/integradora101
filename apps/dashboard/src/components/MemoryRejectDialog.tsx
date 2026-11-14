import { ConfirmDialog } from "./ConfirmDialog";
import { FieldErrors, fieldErrorProps, type FieldErrorMap } from "./FieldErrors";
import type { ConfirmationCopy } from "@/viewmodels/confirmation";
import type { MemoryRejectedField } from "@/viewmodels/admin-types";
import {
  REJECTION_REASON_MAX,
  canConfirmRejection,
  memoryFieldLabels,
  memoryRejectFieldOptions,
} from "@/viewmodels/memory-review-shared";

/**
 * Diálogo de rechazo sobre `ConfirmDialog`: motivo de 1 a 500 con contador y
 * casillas «La foto» y «La opinión» (al menos una). «Confirmar» queda
 * deshabilitado mientras falte cualquiera (CA-09).
 */
export function MemoryRejectDialog({
  copy,
  reason,
  fields,
  busy,
  error,
  fieldErrors,
  onReasonChange,
  onFieldToggle,
  onConfirm,
  onCancel,
}: {
  copy: ConfirmationCopy | null;
  reason: string;
  fields: MemoryRejectedField[];
  busy: boolean;
  error: string;
  fieldErrors: FieldErrorMap;
  onReasonChange: (reason: string) => void;
  onFieldToggle: (field: MemoryRejectedField) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <ConfirmDialog
      copy={copy}
      idleTitle="Rechazar petición"
      busy={busy}
      confirmDisabled={!canConfirmRejection(reason, fields)}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="arca-field">
        <label className="arca-field__label" htmlFor="memory-reject-reason">
          Motivo
        </label>
        <textarea
          id="memory-reject-reason"
          className="arca-field__control arca-field__control--textarea"
          rows={4}
          maxLength={REJECTION_REASON_MAX}
          required
          value={reason}
          onChange={(event) => onReasonChange(event.target.value)}
          {...fieldErrorProps("memory-reject-reason", fieldErrors, "rejection_reason")}
        />
        <span className="field-counter">
          {reason.length}/{REJECTION_REASON_MAX}
        </span>
        <FieldErrors id="memory-reject-reason" errors={fieldErrors} name="rejection_reason" />
      </div>
      <fieldset
        className="memory-review__fields"
        {...fieldErrorProps("memory-reject-fields", fieldErrors, "rejected_fields")}
      >
        <legend>¿Qué falló?</legend>
        {memoryRejectFieldOptions.map((field) => (
          <label className="memory-review__check" key={field}>
            <input
              type="checkbox"
              checked={fields.includes(field)}
              onChange={() => onFieldToggle(field)}
            />
            {memoryFieldLabels[field]}
          </label>
        ))}
        <FieldErrors id="memory-reject-fields" errors={fieldErrors} name="rejected_fields" />
      </fieldset>
    </ConfirmDialog>
  );
}
