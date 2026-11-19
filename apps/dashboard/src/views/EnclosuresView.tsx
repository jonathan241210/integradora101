import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Dialog, Field } from "@arca/ui";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EnclosureQrDialog } from "@/components/EnclosureQrDialog";
import { DialogFormFooter } from "@/components/FormActions";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { PaginationBar } from "@/components/PaginationBar";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { EnclosureDto } from "@/viewmodels/admin-types";
import { formatCount } from "@/viewmodels/formatters";
import { hasActiveQr, qrCardButton, QR_TEXTS } from "@/viewmodels/enclosure-qr";
import {
  getEnclosureConfirmation,
  getEnclosureWarning,
  type EnclosuresViewModel,
} from "@/viewmodels/enclosures-management";

function EnclosureForm({
  enclosure,
  errors,
  error,
  busy,
  onSubmit,
  onCancel,
}: {
  enclosure: EnclosureDto | null;
  errors: Record<string, string[]>;
  error: string;
  busy: boolean;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(enclosure?.name ?? "");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(name);
  };

  return (
    <form className="dialog-form" onSubmit={submit}>
      <Field
        id="enclosure-name"
        label="Nombre del recinto"
        autoComplete="off"
        required
        maxLength={100}
        value={name}
        onChange={(event) => setName(event.target.value)}
        {...fieldErrorProps("enclosure-name", errors, "name")}
      />
      <FieldErrors id="enclosure-name" errors={errors} name="name" />
      <DialogFormFooter
        error={error}
        busy={busy}
        submitLabel={enclosure ? "Guardar nombre" : "Crear recinto"}
        onCancel={onCancel}
      />
    </form>
  );
}

export function EnclosuresView({ state, actions, page, pageCount, pageItems, canManage }: EnclosuresViewModel) {
  const { dialog } = state;
  const formDialog = dialog?.kind === "create" || dialog?.kind === "rename" ? dialog : null;
  const confirmation = getEnclosureConfirmation(dialog);
  const warning = getEnclosureWarning(dialog);
  const qrDialog = dialog?.kind === "qr" ? dialog : null;
  const sectionError = dialog === null ? state.actionError : "";

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Recintos"
        title="Recintos"
        description="Consulta los recintos del zoológico, crea nuevos y renómbralos."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      {sectionError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {sectionError}
        </Alert>
      )}
      <div className="list-toolbar">
        <Button onClick={() => actions.openDialog({ kind: "create" })}>
          Crear recinto
        </Button>
      </div>
      <ListStatusMessage
        status={state.status}
        error={state.error}
        loadingText="Cargando recintos…"
        emptyText="Aún no hay recintos registrados."
        onRetry={actions.reload}
      />
      {state.status === "ready" && (
        <ul className="enclosure-grid" aria-label="Recintos">
          {pageItems.map((enclosure) => (
            <li key={enclosure.id} data-search-id={`enclosures:${enclosure.id}`}>
              <Card className="enclosure-card">
                <div className="card-heading">
                  <div>
                    <h2>{enclosure.name}</h2>
                    <p>
                      {formatCount(enclosure.animals_count)}{" "}
                      {enclosure.animals_count === 1 ? "animal" : "animales"}
                    </p>
                  </div>
                  <div className="enclosure-card__badges">
                    <Badge tone={enclosure.is_active ? "success" : "neutral"}>
                      {enclosure.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                    {canManage && !hasActiveQr(enclosure) && (
                      <Badge tone="warning">{QR_TEXTS.badgeWithoutQr}</Badge>
                    )}
                  </div>
                </div>
                <div className="enclosure-card__actions">
                  <Button
                    variant="secondary"
                    aria-label={`Renombrar el recinto ${enclosure.name}`}
                    onClick={() => actions.openDialog({ kind: "rename", item: enclosure })}
                  >
                    Renombrar
                  </Button>
                  {canManage && (
                    <>
                      {/* Acción «QR del recinto» (dashboard-013 CA-01, CA-18) */}
                      <Button
                        variant="secondary"
                        aria-label={qrCardButton(hasActiveQr(enclosure), enclosure.name).ariaLabel}
                        onClick={() => actions.openQr(enclosure)}
                      >
                        {qrCardButton(hasActiveQr(enclosure), enclosure.name).label}
                      </Button>
                      <Button
                        variant="secondary"
                        aria-label={`${enclosure.is_active ? "Desactivar" : "Activar"} recinto ${enclosure.name}`}
                        onClick={() => actions.toggleStatus(enclosure)}
                      >
                        {enclosure.is_active ? "Desactivar" : "Activar"}
                      </Button>
                      <Button
                        variant="danger"
                        aria-label={`Eliminar recinto ${enclosure.name}`}
                        onClick={() => actions.requestDelete(enclosure)}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {state.status === "ready" && state.items.length > 0 && (
        <PaginationBar
          page={page}
          lastPage={pageCount}
          total={state.items.length}
          showPageNumbers
          onPageChange={actions.goToPage}
        />
      )}

      <ConfirmDialog
        copy={confirmation}
        idleTitle="Confirmar acción de recinto"
        busy={state.saving}
        error={state.actionError}
        onConfirm={actions.confirm}
        onCancel={actions.closeDialog}
      >
        {warning && <p className="confirm-dialog__warning">{warning}</p>}
      </ConfirmDialog>

      {qrDialog && (
        <EnclosureQrDialog
          key={`qr-${qrDialog.item.id}`}
          enclosure={qrDialog.item}
          intent={qrDialog.intent}
          focus={qrDialog.focus}
          onClose={actions.closeDialog}
          onHasQr={(hasQr) => actions.setHasQr(qrDialog.item.id, hasQr)}
          onNotFound={actions.qrNotFound}
        />
      )}

      <Dialog
        open={formDialog !== null}
        title={
          dialog?.kind === "rename"
            ? "Renombrar recinto"
            : dialog?.kind === "create"
              ? "Crear recinto"
              : "Formulario de recinto"
        }
        onClose={actions.closeDialog}
        className="form-dialog"
      >
        {formDialog && (
          <EnclosureForm
            key={formDialog.kind === "rename" ? `rename-${formDialog.item.id}` : "create"}
            enclosure={formDialog.kind === "rename" ? formDialog.item : null}
            errors={state.fieldErrors}
            error={state.actionError}
            busy={state.saving}
            onSubmit={actions.save}
            onCancel={actions.closeDialog}
          />
        )}
      </Dialog>
    </>
  );
}
