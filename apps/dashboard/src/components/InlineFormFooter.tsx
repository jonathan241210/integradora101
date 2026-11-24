import { Button } from "@arca/ui";
import { ActionError } from "./DashboardNotifications";

/** Error general y botones de un formulario fijo (alta o edición). */
export function InlineFormFooter({
  error,
  busy,
  editing,
  submitLabel,
  onCancelEdit,
}: {
  error: string;
  busy: boolean;
  editing: boolean;
  submitLabel: string;
  onCancelEdit: () => void;
}) {
  return (
    <div className="form-actions form-actions--inline">
      <ActionError message={error} />
      <div className="form-actions__buttons">
        {editing && (
          <Button type="button" variant="secondary" disabled={busy} onClick={onCancelEdit}>
            Cancelar edición
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}
