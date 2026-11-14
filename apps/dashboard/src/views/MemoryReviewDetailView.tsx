import { Alert, Button, Card } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { MemoryImage } from "@/components/MemoryImage";
import { MemoryRejectDialog } from "@/components/MemoryRejectDialog";
import { MemoryStatusBadge } from "@/components/MemoryStatusBadge";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import { formatDateTime } from "@/viewmodels/formatters";
import { detailActions, type MemoryDetailViewModel } from "@/viewmodels/memory-review";
import {
  MEMORY_IMAGE_REQUIRED_MESSAGE,
  MEMORY_WAITING_CORRECTION,
  NO_OPINION_TEXT,
  memoryAcceptCopy,
  memoryFieldLabels,
  memoryRejectCopy,
  publicationText,
  resubmittedText,
} from "@/viewmodels/memory-review-shared";

const heading = (
  <SectionHeading
    eyebrow="Momentos para recordar"
    title="Revisar petición"
    description="Revisa la foto y la opinión antes de decidir."
  />
);

/** Detalle de una petición: opinión, imagen, decisión y diálogos (CA-05 a CA-12, CA-18, CA-19). */
export function MemoryReviewDetailView({
  state,
  actions,
  onBack,
}: MemoryDetailViewModel & { onBack: () => void }) {
  const data = state.data;
  const back = (
    <Button variant="secondary" onClick={onBack}>
      Volver a la lista
    </Button>
  );

  if (state.status === "loading" || state.status === "idle") {
    return (
      <>
        {heading}
        <p className="state-message" role="status" aria-live="polite">
          Cargando petición…
        </p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        {heading}
        <div className="state-message state-message--error">
          <Alert role="alert" aria-live="assertive">
            {state.error}
          </Alert>
          {state.retryable && (
            <Button variant="secondary" onClick={actions.reload}>
              Reintentar
            </Button>
          )}
          {back}
        </div>
      </>
    );
  }

  const available = detailActions(state);
  const imageBlocked = available.acceptBlockedByImage;
  const resubmitted = resubmittedText(data.resubmitted_count);

  return (
    <>
      {heading}
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      {state.alert && (
        <Alert className="global-feedback" role="alert" aria-live="assertive">
          {state.alert}
          <Button
            className="feedback-close"
            variant="ghost"
            aria-label="Cerrar aviso"
            onClick={actions.dismissAlert}
          >
            Cerrar
          </Button>
        </Alert>
      )}
      <Card className="memory-review__detail">
        <div className="memory-review__bar">{back}</div>
        <p className="memory-review__meta">
          <MemoryStatusBadge status={data.status} />
          <span>Enviada el {formatDateTime(data.created_at)}</span>
          {resubmitted && <span className="memory-review__resubmitted">{resubmitted}</span>}
        </p>

        <section aria-labelledby="memory-review-opinion-title">
          <h2 id="memory-review-opinion-title" className="memory-review__title">
            Opinión
          </h2>
          <p className="memory-review__opinion">{data.opinion ?? NO_OPINION_TEXT}</p>
        </section>

        <section aria-labelledby="memory-review-image-title">
          <h2 id="memory-review-image-title" className="memory-review__title">
            Foto
          </h2>
          <MemoryImage image={state.image} />
        </section>

        {available.canDecide && (
          <div className="memory-review__actions">
            <Button disabled={!available.canAccept} onClick={actions.openAccept}>
              Aceptar
            </Button>
            <Button variant="secondary" disabled={state.busy} onClick={actions.openReject}>
              Rechazar
            </Button>
            {imageBlocked && <p className="memory-review__hint">{MEMORY_IMAGE_REQUIRED_MESSAGE}</p>}
          </div>
        )}

        {data.status === "rejected" && (
          <section className="memory-review__decision" aria-labelledby="memory-review-rejected-title">
            <h2 id="memory-review-rejected-title" className="memory-review__title">
              Rechazada
            </h2>
            <p>{MEMORY_WAITING_CORRECTION}</p>
            <dl className="memory-review__facts">
              <div>
                <dt>Motivo</dt>
                <dd>{data.rejection_reason ?? "—"}</dd>
              </div>
              <div>
                <dt>Qué falló</dt>
                <dd>
                  {data.rejected_fields.length > 0
                    ? data.rejected_fields.map((field) => memoryFieldLabels[field]).join(", ")
                    : "—"}
                </dd>
              </div>
            </dl>
          </section>
        )}

        {data.status === "accepted" && (
          <section className="memory-review__decision" aria-labelledby="memory-review-accepted-title">
            <h2 id="memory-review-accepted-title" className="memory-review__title">
              Aceptada
            </h2>
            <dl className="memory-review__facts">
              <div>
                <dt>Fecha de publicación</dt>
                <dd>{formatDateTime(data.published_at)}</dd>
              </div>
            </dl>
            <p>{publicationText(data.is_published, formatDateTime(data.published_until))}</p>
          </section>
        )}
      </Card>

      <ConfirmDialog
        copy={state.pendingAction === "accept" ? memoryAcceptCopy(data.publication_days) : null}
        idleTitle="Aceptar petición"
        busy={state.busy}
        error={state.dialogError}
        onConfirm={actions.confirmDecision}
        onCancel={actions.closeDecision}
      />
      <MemoryRejectDialog
        copy={state.pendingAction === "reject" ? memoryRejectCopy() : null}
        reason={state.rejectReason}
        fields={state.rejectFields}
        busy={state.busy}
        error={state.dialogError}
        fieldErrors={state.fieldErrors}
        onReasonChange={actions.changeRejectReason}
        onFieldToggle={actions.toggleRejectField}
        onConfirm={actions.confirmDecision}
        onCancel={actions.closeDecision}
      />
    </>
  );
}
