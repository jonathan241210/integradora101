import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Alert, Button, Dialog, Field, LockoutNotice, useCountdown, validRetryAfter } from "@arca/ui";
import type { StepUpDialogState } from "@/viewmodels/step-up";

const titleText = "Confirma tu contraseña";
const alwaysText = "Confirma tu contraseña para realizar esta acción.";
const windowText = "Por seguridad, confirma tu contraseña para continuar con esta operación.";

/**
 * Diálogo de confirmación de contraseña (dashboard-015). Es la única vista
 * modal permitida en Usuarios (excepción a dashboard-004 RN-01). La
 * contraseña vive solo en el estado local mientras se escribe: se vacía al
 * enviar y al cerrar (CA-07). Los mensajes de error los da la API (CA-15).
 */
export function StepUpConfirmationDialog({
  dialog,
  onSubmit,
  onCancel,
}: {
  dialog: StepUpDialogState;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}) {
  const [password, setPassword] = useState("");
  const [waiting, setWaiting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const { open, status } = dialog;

  // Guarda el disparador antes de que `Dialog` mueva el foco (CA-08, CA-13).
  useLayoutEffect(() => {
    if (open) {
      trigger.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

      return () => {
        setPassword("");
        trigger.current?.focus();
        trigger.current = null;
      };
    }
  }, [open]);

  // Tras cada respuesta de la API el foco vuelve al campo vacío (CA-01, CA-03).
  useEffect(() => {
    if (open && status !== "submitting" && status !== "confirmed") {
      inputRef.current?.focus();
    }
  }, [open, status, dialog.message]);

  // La cuenta regresiva bloquea el botón; sin `retryAfterSeconds` bloquea hasta
  // que el usuario edite el campo (CA-04, CA-21, CA-24).
  const rateLimitedSeconds = status === "rate-limited" ? dialog.retryAfterSeconds : null;
  const countdown = useCountdown(rateLimitedSeconds);
  const counting = validRetryAfter(rateLimitedSeconds) !== null;

  useEffect(() => {
    setWaiting(status === "rate-limited" && !counting);
  }, [status, dialog.message, counting]);

  const submitting = status === "submitting" || status === "confirmed";
  const hasError = status === "wrong-password" || status === "rate-limited" || status === "error";
  const canConfirm = password.length > 0 && !submitting && !waiting && !countdown.running;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConfirm) return;

    const value = password;

    setPassword("");
    onSubmit(value);
  };

  return (
    <Dialog open={open} title={titleText} onClose={onCancel} className="confirm-dialog step-up-dialog">
      {open && (
        <form className="dialog-form" onSubmit={submit}>
          <p className="confirm-dialog__message">
            {dialog.mode === "always" ? alwaysText : windowText}
          </p>
          <Field
            ref={inputRef}
            id="step-up-password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            aria-invalid={hasError ? true : undefined}
            aria-describedby={
              hasError ? (status === "rate-limited" && counting ? "step-up-lockout" : "step-up-error") : undefined
            }
            onChange={(event) => {
              setPassword(event.target.value);
              if (status === "rate-limited" && !counting) {
                setWaiting(false);
              }
            }}
          />
          <LockoutNotice
            id="step-up-lockout"
            alertClassName="auth-alert dialog-alert"
            countdown={countdown}
            initialSeconds={validRetryAfter(rateLimitedSeconds)}
          />
          <div aria-live="polite">
            {hasError && !(status === "rate-limited" && counting) && (
              <Alert
                id="step-up-error"
                className="dialog-alert"
                role="alert"
                aria-live="assertive"
              >
                {dialog.message}
              </Alert>
            )}
          </div>
          {submitting && (
            <p className="auth-loading" role="status" aria-live="polite">
              Confirmando…
            </p>
          )}
          <div className="dialog-actions">
            <Button type="button" variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canConfirm}>
              Confirmar
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
