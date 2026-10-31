import { Alert, Button } from "@arca/ui";

/** Error general de una operación y botones de un formulario en diálogo. */
export function DialogFormFooter({
  error,
  busy,
  submitLabel,
  onCancel,
}: {
  error: string;
  busy: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <>
      {error && (
        <Alert className="dialog-alert" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      <div className="dialog-actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </>
  );
}
