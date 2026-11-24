import { useEffect, useRef, useState } from "react";
import { Field } from "@arca/ui";
import type { StaffAccountDto } from "@/viewmodels/admin-types";
import { confirmationFromCopy } from "@/viewmodels/confirmation";
import type { PendingAction } from "@/viewmodels/inline-list";
import {
  discardPassword,
  emptyPasswordField,
  submitPassword,
  togglePasswordVisibility,
  typePassword,
  type PasswordFieldState,
} from "@/viewmodels/password-field";
import { getStaffConfirmation } from "@/viewmodels/staff-accounts";
import { ConfirmDialog } from "./ConfirmDialog";
import { FieldErrors, fieldErrorProps } from "./FieldErrors";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

/**
 * Manejadores del campo de nueva contraseña (dashboard-004 CA-10, RN-04),
 * separados del marcado para poder probarlos sin DOM. El valor se entrega a
 * `onConfirm` y se descarta al enviar o cancelar; con una petición en curso
 * (`busy`) ni se reenvía ni se cancela.
 */
export function createPasswordResetHandlers({
  field,
  setField,
  busy,
  onConfirm,
  onCancel,
}: {
  field: PasswordFieldState;
  setField: (field: PasswordFieldState) => void;
  busy: boolean;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  return {
    change: (value: string) => setField(typePassword(field, value)),
    toggle: () => setField(togglePasswordVisibility(field)),
    submit: () => {
      const result = submitPassword(field, busy);

      if (result.sent === null) return;

      setField(result.state);
      onConfirm(result.sent);
    },
    cancel: () => {
      if (busy) return;

      setField(discardPassword());
      onCancel();
    },
  };
}

/**
 * Confirmación de las acciones sobre una cuenta (activar, desactivar,
 * eliminar, restablecer contraseña y 2FA) en ventana modal (dashboard-020,
 * revisión 2026-11-21 (b)). El error de la acción va dentro del diálogo (D-3).
 * Con una acción que pide la contraseña del administrador (dashboard-015),
 * `StepUpConfirmationDialog` se abre encima de este diálogo y este sigue
 * abierto debajo, sin cerrarse.
 */
export function StaffActionDialog({
  pending,
  account,
  busy,
  error,
  fieldErrors,
  onConfirm,
  onCancel,
}: {
  pending: PendingAction | null;
  account: StaffAccountDto | undefined;
  busy: boolean;
  error: string;
  fieldErrors: Record<string, string[]>;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  const [field, setField] = useState(emptyPasswordField);
  const inputRef = useRef<HTMLInputElement>(null);
  const open = pending !== null && account !== undefined;
  const isReset = open && pending.type === "reset-password";
  const copy = open
    ? confirmationFromCopy(getStaffConfirmation(pending.type, account))
    : null;
  const handlers = createPasswordResetHandlers({ field, setField, busy, onConfirm, onCancel });

  // Nunca queda una contraseña escrita al cerrar el diálogo (RN-04).
  useEffect(() => {
    if (!open) setField(emptyPasswordField);
  }, [open, pending?.type, pending?.id]);

  // El foco inicial va al campo de contraseña; `Dialog` lo mueve al abrir, así que se aplica después.
  useEffect(() => {
    if (!isReset) return;

    const frame = requestAnimationFrame(() => inputRef.current?.focus());

    return () => cancelAnimationFrame(frame);
  }, [isReset, pending?.id]);

  const fieldId = "staff-action-new-password";

  return (
    <ConfirmDialog
      copy={copy}
      idleTitle="Confirmar acción de cuenta"
      busy={busy}
      error={error}
      onConfirm={() => (isReset ? handlers.submit() : onConfirm(""))}
      onCancel={isReset ? handlers.cancel : onCancel}
    >
      {isReset && (
        <>
          <Field
            ref={inputRef}
            id={fieldId}
            label="Nueva contraseña"
            type={field.visible ? "text" : "password"}
            autoComplete="new-password"
            required
            value={field.value}
            onChange={(event) => handlers.change(event.target.value)}
            {...fieldErrorProps(fieldId, fieldErrors, "password")}
          />
          <FieldErrors id={fieldId} errors={fieldErrors} name="password" />
          <PasswordVisibilityToggle
            controls={fieldId}
            visible={field.visible}
            onToggle={handlers.toggle}
          />
        </>
      )}
    </ConfirmDialog>
  );
}
