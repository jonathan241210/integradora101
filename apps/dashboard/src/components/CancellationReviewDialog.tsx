import { useEffect, useRef, type FormEvent } from "react";
import { Alert, Button, Dialog, TextAreaField } from "@arca/ui";
import { ActionError, usePublishNotice } from "@/components/DashboardNotifications";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { formatDate } from "@/viewmodels/formatters";
import {
  NOTE_MAX,
  NOTE_MIN,
  noteLength,
  noteLimitAnnouncement,
  reviewStatusOptions,
  type CancellationReviewViewModel,
} from "@/viewmodels/cancellation-review";

/** Aviso accesible de éxito («Revisión guardada.») o de acción cerrada (403). */
function ReviewNotice({ notice }: { notice: CancellationReviewViewModel["dialog"]["notice"] }) {
  const publish = usePublishNotice();
  const published = useRef(0);

  useEffect(() => {
    if (!notice || !publish || published.current === notice.nonce) return;
    published.current = notice.nonce;
    publish(notice.message, notice.tone);
  }, [notice, publish]);

  // Sin proveedor de avisos el texto queda en línea para no perderse.
  if (!notice || publish) return null;

  return <Alert role={notice.tone === "error" ? "alert" : "status"}>{notice.message}</Alert>;
}

/**
 * Diálogo «Registrar revisión» (dashboard-021 CA-06, CA-08, CA-14). El foco inicial queda en
 * la primera opción (primer control del diálogo modal), Escape cierra y el navegador
 * devuelve el foco al botón que lo abrió. La validación de longitud es solo un aviso temprano
 * (RN-04); la API decide.
 */
export function CancellationReviewDialog({ review }: { review: CancellationReviewViewModel }) {
  const { dialog, actions } = review;
  const { target } = dialog;
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (dialog.noteFocusNonce > 0) noteRef.current?.focus();
  }, [dialog.noteFocusNonce]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.submit();
  };

  return (
    <>
    <ReviewNotice notice={dialog.notice} />
    <Dialog
      open={target !== null}
      title="Registrar revisión"
      onClose={actions.close}
      className="form-dialog"
    >
      {target && (
        <form className="dialog-form" onSubmit={submit} noValidate>
          <p className="confirm-dialog__message">
            {target.cashierName} · {formatDate(target.date)}
          </p>
          <fieldset
            className="cancellation-review-options"
            {...fieldErrorProps("review-status", dialog.fieldErrors, "status")}
          >
            <legend>Decisión</legend>
            {reviewStatusOptions.map((option) => (
              <label key={option.value} className="cancellation-review-option">
                <input
                  type="radio"
                  name="review-status"
                  value={option.value}
                  checked={dialog.status === option.value}
                  disabled={dialog.busy}
                  onChange={() => actions.setStatus(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
          <FieldErrors id="review-status" errors={dialog.fieldErrors} name="status" />
          <TextAreaField
            id="review-note"
            ref={noteRef}
            label="Nota"
            aria-required="true"
            rows={4}
            value={dialog.note}
            disabled={dialog.busy}
            onChange={(event) => actions.setNote(event.target.value)}
            {...fieldErrorProps("review-note", dialog.fieldErrors, "note")}
          />
          <p className="cancellation-review-counter">
            {noteLength(dialog.note)} / {NOTE_MAX} caracteres (mínimo {NOTE_MIN})
          </p>
          <p className="visually-hidden" role="status">
            {noteLimitAnnouncement(dialog.note)}
          </p>
          <FieldErrors id="review-note" errors={dialog.fieldErrors} name="note" />
          <ActionError message={dialog.error} inDialog />
          <div className="dialog-actions">
            <Button type="button" variant="secondary" disabled={dialog.busy} onClick={actions.close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={dialog.busy}>
              {dialog.busy ? "Guardando…" : "Guardar revisión"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
    </>
  );
}
