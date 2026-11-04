import { useEffect, useRef } from "react";
import { Alert, Button } from "@arca/ui";
import type { InlineConfirmCopy } from "@/viewmodels/inline-list";

/**
 * Escape cancela la acción en línea (CA-12), salvo con una petición en curso:
 * no se puede cancelar lo que ya se envió.
 */
export function cancelOnEscape(
  event: { key: string; stopPropagation: () => void },
  onCancel: () => void,
  busy = false,
): void {
  if (event.key !== "Escape" || busy) return;

  event.stopPropagation();
  onCancel();
}

/**
 * Confirmación dentro de la tarjeta o fila (dashboard-004 RN-02). El foco
 * inicial va a «Cancelar» para evitar confirmaciones por error.
 */
export function InlineConfirm({
  copy,
  busy,
  error,
  onConfirm,
  onCancel,
}: {
  copy: InlineConfirmCopy;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div
      className="inline-confirm"
      role="group"
      aria-label={copy.label}
      onKeyDown={(event) => cancelOnEscape(event, onCancel, busy)}
    >
      <p className="inline-confirm__message">{copy.message}</p>
      {error && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      <div className="inline-confirm__actions">
        <Button ref={cancelRef} type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          type="button"
          variant={copy.danger ? "danger" : "primary"}
          disabled={busy}
          onClick={onConfirm}
        >
          {busy ? "Procesando…" : copy.confirmLabel}
        </Button>
      </div>
    </div>
  );
}
