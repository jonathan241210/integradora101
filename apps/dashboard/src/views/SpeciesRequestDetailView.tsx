import { Alert, Button, Card } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { NoticeBar } from "@/components/NoticeBar";
import { RejectSpeciesRequestDialog } from "@/components/RejectSpeciesRequestDialog";
import { SectionHeading } from "@/components/SectionHeading";
import { SpeciesFichaForm } from "@/components/SpeciesFichaForm";
import { SpeciesPhoto } from "@/components/SpeciesPhoto";
import { SpeciesStatusBadge } from "@/components/SpeciesStatusBadge";
import type { SpeciesRequestDetailDto } from "@/viewmodels/admin-types";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  categoryLabel,
  fichaFieldOptions,
  originLabel,
  requestTypeLabels,
  unpublishedSpeciesLabel,
} from "@/viewmodels/species-publication-shared";
import {
  acceptDialogCopy,
  rejectDialogCopy,
  requestActions,
  unpublishedCatalogWarning,
  type SpeciesRequestsViewModel,
} from "@/viewmodels/species-requests";

const dash = (value: string | null | undefined) => (value ? value : "—");

function Comparison({ detail }: { detail: SpeciesRequestDetailDto }) {
  const rows: { label: string; current: string; proposed: string }[] = [
    {
      label: "Nombre científico",
      current: dash(detail.current.scientific_name),
      proposed: dash(detail.proposed.scientific_name),
    },
    { label: "Hábitat", current: dash(detail.current.habitat), proposed: dash(detail.proposed.habitat) },
    { label: originLabel, current: dash(detail.current.origin), proposed: dash(detail.proposed.origin) },
    {
      label: "Tipo de animal",
      current: categoryLabel(detail.current.category),
      proposed: categoryLabel(detail.proposed.category),
    },
  ];

  return (
    <div className="species-compare">
      <section aria-labelledby="species-current-title">
        <h2 id="species-current-title">Datos actuales</h2>
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.current}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section aria-labelledby="species-proposed-title">
        <h2 id="species-proposed-title">Datos propuestos</h2>
        <dl>
          {rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.proposed}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

/** Detalle de una solicitud: actual frente a propuesto, foto, edición y decisiones. */
export function SpeciesRequestDetailView({ state, dirty, actions }: SpeciesRequestsViewModel) {
  const { detail } = state;
  const data = detail.data;
  const back = (
    <Button variant="secondary" onClick={actions.close}>
      Volver a la lista
    </Button>
  );

  if (detail.status === "loading" || detail.status === "idle") {
    return (
      <>
        <SectionHeading
          eyebrow="Publicación de especies"
          title="Solicitud de especie"
          description="Revisa los datos antes de decidir."
        />
        <p className="state-message" role="status" aria-live="polite">
          Cargando solicitud…
        </p>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <SectionHeading
          eyebrow="Publicación de especies"
          title="Solicitud de especie"
          description="Revisa los datos antes de decidir."
        />
        <div className="state-message state-message--error">
          <Alert role="alert" aria-live="assertive">
            {detail.error}
          </Alert>
          {detail.status === "error" && !detail.forbidden && (
            <Button variant="secondary" onClick={actions.reloadDetail}>
              Reintentar
            </Button>
          )}
          {back}
        </div>
      </>
    );
  }

  const available = requestActions(data, dirty);
  const unpublished = data.current.publication_status === "unpublished";
  const decision = state.pendingAction;
  const acceptDecision = decision === "accept-publish" || decision === "accept-unpublished" ? decision : null;
  const editing = state.mode === "edit" && state.draft !== null;

  return (
    <>
      <SectionHeading
        eyebrow="Publicación de especies"
        title={`Solicitud: ${data.current.common_name}`}
        description="Compara los datos actuales con los propuestos y decide."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      <div className="species-detail__bar">{back}</div>

      <Card className="species-detail">
        <p className="species-detail__meta">
          <span>{requestTypeLabels[data.request_type]}</span>
          {unpublished && <span className="species-tag">{unpublishedSpeciesLabel}</span>}
          <SpeciesStatusBadge status={data.status} />
        </p>
        <dl className="species-detail__facts">
          <div>
            <dt>Nombre común</dt>
            <dd>
              {data.current.common_name} <small>(no editable)</small>
            </dd>
          </div>
          <div>
            <dt>Veterinario solicitante</dt>
            <dd>{dash(data.veterinarian_name)}</dd>
          </div>
          <div>
            <dt>Fecha de envío</dt>
            <dd>{formatDateTime(data.created_at)}</dd>
          </div>
        </dl>

        {unpublished && data.status === "submitted" && (
          <Alert role="note">{unpublishedCatalogWarning}</Alert>
        )}

        <Comparison detail={data} />

        <div className="species-detail__photos">
          <div>
            <h3>Foto de la solicitud</h3>
            {data.proposed.has_new_photo ? (
              <SpeciesPhoto slot={state.pendingPhoto} alt={`Foto de ${data.current.common_name}`} />
            ) : (
              <p>
                {data.current.has_image
                  ? "Sin foto nueva: se mantiene la foto publicada."
                  : "La solicitud no trae foto."}
              </p>
            )}
          </div>
          {data.current.has_image && (
            <div>
              <h3>Foto publicada</h3>
              <SpeciesPhoto
                slot={state.publishedPhoto}
                alt={`Foto publicada de ${data.current.common_name}`}
              />
            </div>
          )}
        </div>

        <section className="species-detail__ficha" aria-labelledby="species-ficha-title">
          <h3 id="species-ficha-title">Ficha pública</h3>
          <ul>
            {fichaFieldOptions
              .filter((option) => data.proposed.published_fields.includes(option.key))
              .map((option) => (
                <li key={option.key}>{option.label}</li>
              ))}
          </ul>
        </section>

        {data.status === "accepted" && (
          <Alert role="status">Publicada en el catálogo</Alert>
        )}
        {data.status === "rejected" && (
          <section className="species-detail__reason" aria-labelledby="species-reason-title">
            <h3 id="species-reason-title">Motivo del rechazo</h3>
            <p>{dash(data.rejection_reason)}</p>
          </section>
        )}

        {editing && state.draft && (
          <SpeciesFichaForm
            idPrefix="species-request"
            commonName={data.current.common_name}
            draft={state.draft}
            fieldErrors={state.fieldErrors}
            currentPhoto={state.publishedPhoto}
            newPhoto={state.newPhoto}
            busy={state.busy}
            error={state.dialogError}
            submitLabel="Guardar cambios"
            onChange={actions.changeDraft}
            onToggleField={actions.toggleField}
            onChoosePhoto={actions.choosePhoto}
            onClearPhoto={actions.clearPhoto}
            onSubmit={actions.save}
            onCancel={actions.cancelEdit}
          />
        )}

        {data.status === "submitted" && (
          <div className="species-detail__actions">
            {available.canEdit && !editing && (
              <Button variant="secondary" onClick={actions.startEdit}>
                Editar
              </Button>
            )}
            {available.canAcceptPublish && (
              <Button
                disabled={dirty || state.busy}
                onClick={() => actions.openDecision("accept-publish")}
              >
                Aceptar y publicar
              </Button>
            )}
            {available.canAcceptUnpublished && (
              <Button
                variant="secondary"
                disabled={dirty || state.busy}
                onClick={() => actions.openDecision("accept-unpublished")}
              >
                Aceptar sin publicar
              </Button>
            )}
            {available.canReject && (
              <Button
                variant="danger"
                disabled={state.busy}
                onClick={() => actions.openDecision("reject")}
              >
                Rechazar
              </Button>
            )}
            {available.saveFirstNotice && (
              <p className="species-detail__hint" role="status">
                {available.saveFirstNotice}
              </p>
            )}
          </div>
        )}
      </Card>

      <ConfirmDialog
        copy={acceptDecision ? acceptDialogCopy(data, acceptDecision) : null}
        idleTitle="Aceptar solicitud"
        busy={state.busy}
        error={acceptDecision ? state.dialogError : ""}
        onConfirm={actions.confirmDecision}
        onCancel={actions.closeDecision}
      >
        <p className="species-dialog__summary">
          <strong>{data.current.common_name}</strong>
          <span>{dash(data.proposed.scientific_name)}</span>
        </p>
      </ConfirmDialog>
      <RejectSpeciesRequestDialog
        copy={decision === "reject" ? rejectDialogCopy : null}
        reason={state.rejectReason}
        busy={state.busy}
        error={decision === "reject" ? state.dialogError : ""}
        fieldErrors={state.fieldErrors}
        onReasonChange={actions.changeRejectReason}
        onConfirm={actions.confirmDecision}
        onCancel={actions.closeDecision}
      />
    </>
  );
}
