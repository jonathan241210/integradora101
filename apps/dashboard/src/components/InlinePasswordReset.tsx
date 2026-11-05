import { useEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Field } from "@arca/ui";
import type { InlineConfirmCopy } from "@/viewmodels/inline-list";
import {
  discardPassword,
  emptyPasswordField,
  submitPassword,
  togglePasswordVisibility,
  typePassword,
  type PasswordFieldState,
} from "@/viewmodels/password-field";
import { cancelOnEscape } from "./InlineConfirm";
import { FieldErrors, fieldErrorProps } from "./FieldErrors";
import { PasswordVisibilityToggle } from "./PasswordVisibilityToggle";

/**
 * Manejadores del campo de nueva contraseña (CA-10, CA-12, RN-04), separados
 * del marcado para poder probarlos sin DOM. El valor se entrega a `onConfirm`
 * y se descarta al enviar o cancelar; con una petición en curso (`busy`) ni se
 * reenvía ni Escape cancela.
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
  const cancel = () => {
    setField(discardPassword());
    onCancel();
  };

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
      if (!busy) cancel();
    },
    keyDown: (event: { key: string; stopPropagation: () => void }) =>
      cancelOnEscape(event, cancel, busy),
  };
}

/**
 * Campo de nueva contraseña en línea (dashboard-004 CA-10). El valor vive solo
 * en el estado local del campo. «Mostrar» vuelve a ocultarse al confirmar.
 */
export function InlinePasswordReset({
  idPrefix,
  copy,
  busy,
  error,
  errors,
  onConfirm,
  onCancel,
}: {
  idPrefix: string;
  copy: InlineConfirmCopy;
  busy: boolean;
  error?: string;
  errors: Record<string, string[]>;
  onConfirm: (password: string) => void;
  onCancel: () => void;
}) {
  const [field, setField] = useState(emptyPasswordField);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldId = `${idPrefix}-new-password`;
  const handlers = createPasswordResetHandlers({ field, setField, busy, onConfirm, onCancel });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    handlers.submit();
  };

  return (
    <form
      className="inline-confirm inline-password"
      role="group"
      aria-label={copy.label}
      onSubmit={submit}
      onKeyDown={handlers.keyDown}
    >
      <p className="inline-confirm__message">{copy.message}</p>
      <Field
        ref={inputRef}
        id={fieldId}
        label="Nueva contraseña"
        type={field.visible ? "text" : "password"}
        autoComplete="new-password"
        required
        value={field.value}
        onChange={(event) => handlers.change(event.target.value)}
        {...fieldErrorProps(fieldId, errors, "password")}
      />
      <FieldErrors id={fieldId} errors={errors} name="password" />
      <PasswordVisibilityToggle
        controls={fieldId}
        visible={field.visible}
        onToggle={handlers.toggle}
      />
      {error && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      <div className="inline-confirm__actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={handlers.cancel}>
          Cancelar
        </Button>
        <Button type="submit" variant="danger" disabled={busy}>
          {busy ? "Procesando…" : copy.confirmLabel}
        </Button>
      </div>
    </form>
  );
}
