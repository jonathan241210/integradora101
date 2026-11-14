import { PendingRequestNotice } from "@/components/PendingRequestNotice";
import { Alert, Button, Card } from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import { SpeciesFichaForm } from "@/components/SpeciesFichaForm";
import { SpeciesPhoto } from "@/components/SpeciesPhoto";
import { SpeciesStatusBadge } from "@/components/SpeciesStatusBadge";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  publishedActions,
  publishedDialogCopy,
  removeBlockNotice,
  type PublishedSpeciesViewModel,
} from "@/viewmodels/published-species";
import {
  categoryLabel,
  fichaFieldOptions,
  originLabel,
} from "@/viewmodels/species-publication-shared";

const dash = (value: string | null | undefined) => (value ? value : "—");

/** Detalle de una especie publicada o despublicada: ficha, acciones y diálogos (CA-52 a CA-59). */
export function PublishedSpeciesDetailView({
  state,
  dirty,
  actions,
  onOpenRequests,
}: PublishedSpeciesViewModel & { onOpenRequests?: () => void }) {
  const { detail } = state;
  const data = detail.data;
  const back = (
    <Button variant="secondary" onClick={actions.close}>
      Volver a la lista
    </Button>
  );
  const heading = (
    <SectionHeading
      eyebrow="Publicación de especies"
      title="Especie publicada"
      description="Revisa la ficha pública y gestiona su publicación."
    />
  );

  if (detail.status === "loading" || detail.status === "idle") {
    return (
      <>
        {heading}
        <p className="state-message" role="status" aria-live="polite">
          Cargando especie…
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

  const available = publishedActions(data, dirty);
  const editing = state.mode === "edit" && state.draft !== null;
  const copy = publishedDialogCopy(state.pendingAction);

  return (
    <>
      <SectionHeading
        eyebrow="Publicación de especies"
        title={`Especie: ${data.common_name}`}
        description="Revisa la ficha pública y gestiona su publicación."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      <div className="species-detail__bar">{back}</div>

      <Card className="species-detail">
        <p className="species-detail__meta">
          <SpeciesStatusBadge status={available.canUnpublish ? "published" : "unpublished"} />
          {data.has_pending_request && <span className="species-tag">Solicitud pendiente</span>}
        </p>
        <dl className="species-detail__facts">
          <div>
            <dt>Nombre común</dt>
            <dd>
              {data.common_name} <small>(no editable)</small>
            </dd>
          </div>
          <div>
            <dt>Nombre científico</dt>
            <dd>{dash(data.scientific_name)}</dd>
          </div>
          <div>
            <dt>Hábitat</dt>
            <dd>{dash(data.habitat)}</dd>
          </div>
          <div>
            <dt>{originLabel}</dt>
            <dd>{dash(data.origin)}</dd>
          </div>
          <div>
            <dt>Tipo de animal</dt>
            <dd>{categoryLabel(data.category)}</dd>
          </div>
          <div>
            <dt>Publicada el</dt>
            <dd>{data.published_at ? formatDateTime(data.published_at) : "—"}</dd>
          </div>
          {data.unpublished_at && (
            <div>
              <dt>Despublicada el</dt>
              <dd>{formatDateTime(data.unpublished_at)}</dd>
            </div>
          )}
        </dl>

        <div className="species-detail__photos">
          <div>
            <h3>Foto publicada</h3>
            <SpeciesPhoto
              slot={state.photo}
              alt={`Foto publicada de ${data.common_name}`}
              noneText="Sin foto publicada."
            />
          </div>
        </div>

        <section className="species-detail__ficha" aria-labelledby="published-ficha-title">
          <h3 id="published-ficha-title">Ficha pública</h3>
          <ul>
            {fichaFieldOptions
              .filter((option) => (data.published_fields ?? []).includes(option.key))
              .map((option) => (
                <li key={option.key}>{option.label}</li>
              ))}
          </ul>
        </section>

        {editing && state.draft && (
          <SpeciesFichaForm
            idPrefix="published-species"
            commonName={data.common_name}
            draft={state.draft}
            fieldErrors={state.fieldErrors}
            currentPhoto={state.photo}
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

        <div className="species-detail__actions">
          {available.canUnpublish && (
            <Button
              variant="secondary"
              disabled={state.busy}
              onClick={() => actions.openAction("unpublish")}
            >
              Despublicar
            </Button>
          )}
          {available.canEdit && !editing && (
            <Button
              variant="secondary"
              disabled={available.editDisabled || state.busy}
              onClick={actions.startEdit}
            >
              Editar
            </Button>
          )}
          {available.canRepublish && (
            <Button
              disabled={available.republishDisabled || state.busy}
              onClick={() => actions.openAction("republish")}
            >
              Republicar
            </Button>
          )}
          {available.pendingNotice && (
            <PendingRequestNotice message={available.pendingNotice} onOpenRequests={onOpenRequests} />
          )}
          {available.saveFirstNotice && (
            <p className="species-detail__hint" role="status">
              {available.saveFirstNotice}
            </p>
          )}
        </div>

        {available.canRemove && (
          <section className="species-detail__remove" aria-labelledby="published-remove-title">
            <h3 id="published-remove-title">Eliminar publicación</h3>
            <p>{removeBlockNotice}</p>
            <Button
              variant="danger"
              disabled={state.busy}
              onClick={() => actions.openAction("remove")}
            >
              Eliminar publicación
            </Button>
          </section>
        )}
      </Card>

      <ConfirmDialog
        copy={copy}
        idleTitle="Gestionar publicación"
        busy={state.busy}
        error={copy ? state.dialogError : ""}
        onConfirm={actions.confirmAction}
        onCancel={actions.closeAction}
      >
        <p className="species-dialog__summary">
          <strong>{data.common_name}</strong>
          <span>{dash(data.scientific_name)}</span>
        </p>
      </ConfirmDialog>
    </>
  );
}
