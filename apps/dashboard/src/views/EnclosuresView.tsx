import { useState, type FormEvent } from "react";
import { Badge, Button, Card, Dialog, Field, Pagination, SelectField } from "@arca/ui";
import { ActionError } from "@/components/DashboardNotifications";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EnclosureQrDialog } from "@/components/EnclosureQrDialog";
import { DialogFormFooter } from "@/components/FormActions";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { CardGridSkeleton } from "@/components/LoadingSkeletons";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { EnclosureDto } from "@/viewmodels/admin-types";
import { formatCount } from "@/viewmodels/formatters";
import { hasActiveQr, qrCardButton, QR_TEXTS } from "@/viewmodels/enclosure-qr";
import {
  defaultEnclosureFilters,
  getEnclosureConfirmation,
  getEnclosureWarning,
  type EnclosureFilters,
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

export function EnclosuresView({ state, actions, filters, total, page, pageCount, pageItems, canManage }: EnclosuresViewModel) {
  const { dialog } = state;
  const formDialog = dialog?.kind === "create" || dialog?.kind === "rename" ? dialog : null;
  const confirmation = getEnclosureConfirmation(dialog);
  const warning = getEnclosureWarning(dialog);
  const qrDialog = dialog?.kind === "qr" ? dialog : null;
  const animalsDialog = dialog?.kind === "animals" ? dialog : null;
  const sectionError = dialog === null ? state.actionError : "";
  const hasFilters = Boolean(filters.name || filters.status !== "all" || filters.animals !== "all" || (canManage && filters.qr !== "all"));

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Recintos"
        title="Recintos"
        description="Consulta los recintos del zoológico, crea nuevos y renómbralos."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      <ActionError message={sectionError} />
      <div className="list-toolbar">
        <Button onClick={() => actions.openDialog({ kind: "create" })}>
          Crear recinto
        </Button>
      </div>
      {state.status === "ready" && (
        <div className="enclosure-filters" role="group" aria-label="Filtros de recintos">
          <Field
            id="enclosure-filter-name"
            label="Buscar por nombre"
            type="search"
            value={filters.name}
            onChange={(event) => actions.changeFilters({ ...filters, name: event.target.value })}
          />
          <SelectField
            id="enclosure-filter-status"
            label="Estado"
            value={filters.status}
            onChange={(event) => actions.changeFilters({ ...filters, status: event.target.value as EnclosureFilters["status"] })}
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </SelectField>
          <SelectField
            id="enclosure-filter-animals"
            label="Animales"
            value={filters.animals}
            onChange={(event) => actions.changeFilters({ ...filters, animals: event.target.value as EnclosureFilters["animals"] })}
          >
            <option value="all">Todos</option>
            <option value="with">Con animales</option>
            <option value="without">Sin animales</option>
          </SelectField>
          {canManage && (
            <SelectField
              id="enclosure-filter-qr"
              label="Código QR"
              value={filters.qr}
              onChange={(event) => actions.changeFilters({ ...filters, qr: event.target.value as EnclosureFilters["qr"] })}
            >
              <option value="all">Todos</option>
              <option value="with">Con QR activo</option>
              <option value="without">Sin QR activo</option>
            </SelectField>
          )}
          <Button variant="secondary" disabled={!hasFilters} onClick={() => actions.changeFilters(defaultEnclosureFilters)}>
            Limpiar filtros
          </Button>
        </div>
      )}
      <ListStatusMessage
        status={state.status}
        error={state.error}
        loadingText="Cargando recintos…"
        skeleton={<CardGridSkeleton kind="enclosures" label="Cargando recintos…" />}
        emptyText="Aún no hay recintos registrados."
        onRetry={actions.reload}
      />
      {state.status === "ready" && total === 0 && (
        <p className="state-message" role="status">No hay recintos que coincidan con los filtros.</p>
      )}
      {state.status === "ready" && total > 0 && (
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
                      <Button
                        variant="secondary"
                        aria-label={`Ver animales del recinto ${enclosure.name}`}
                        onClick={() => actions.openDialog({ kind: "animals", item: enclosure })}
                      >
                        Ver animales
                      </Button>
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
      {state.status === "ready" && total > 0 && (
        <Pagination
          page={page}
          lastPage={pageCount}
          total={total}
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
        open={animalsDialog !== null}
        title={animalsDialog ? `Animales de ${animalsDialog.item.name}` : "Animales del recinto"}
        onClose={actions.closeDialog}
        className="form-dialog"
      >
        {animalsDialog && (
          <>
            <ListStatusMessage
              status={state.animals.status}
              error={state.animals.error}
              loadingText="Cargando animales…"
              emptyText="Este recinto no tiene animales asignados."
              onRetry={() => actions.openDialog({ ...animalsDialog })}
            />
            {state.animals.status === "ready" && (
              <ul className="enclosure-animal-list" aria-label="Animales asignados">
                {state.animals.items.map((animal) => (
                  <li key={animal.id}>
                    <strong>{animal.name?.trim() || "Sin nombre"}</strong>
                    <span>{animal.species_name?.trim() || "Especie no disponible"}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="dialog-actions">
              <Button variant="secondary" onClick={actions.closeDialog}>Cerrar</Button>
            </div>
          </>
        )}
      </Dialog>

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
