import { useState, type FormEvent } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Dialog,
  Field,
  SelectField,
  TextAreaField,
} from "@arca/ui";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { DialogFormFooter } from "@/components/FormActions";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { EventDto } from "@/viewmodels/admin-types";
import {
  emptyEventForm,
  eventFormFromDto,
  getEventConfirmation,
  type EventFormValues,
  type EventsViewModel,
} from "@/viewmodels/events-management";
import { formatDate, formatTime } from "@/viewmodels/formatters";

function EventForm({
  item,
  errors,
  error,
  busy,
  onSubmit,
  onCancel,
}: {
  item: EventDto | null;
  errors: Record<string, string[]>;
  error: string;
  busy: boolean;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
}) {
  const creating = item === null;
  const [values, setValues] = useState<EventFormValues>(
    item ? eventFormFromDto(item) : emptyEventForm(),
  );
  const set = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };
  const props = (name: string) => ({
    id: `event-${name}`,
    ...fieldErrorProps(`event-${name}`, errors, name),
  });

  return (
    <form className="dialog-form" onSubmit={submit}>
      <Field
        {...props("name")}
        label="Nombre del evento"
        required
        maxLength={200}
        value={values.name}
        onChange={(event) => set("name", event.target.value)}
      />
      <FieldErrors id="event-name" errors={errors} name="name" />
      <TextAreaField
        {...props("description")}
        label="Descripción"
        rows={4}
        value={values.description}
        onChange={(event) => set("description", event.target.value)}
      />
      <FieldErrors id="event-description" errors={errors} name="description" />
      <Field
        {...props("location")}
        label="Ubicación"
        maxLength={255}
        value={values.location}
        onChange={(event) => set("location", event.target.value)}
      />
      <FieldErrors id="event-location" errors={errors} name="location" />
      <Field
        {...props("start_date")}
        label="Fecha de inicio"
        type="date"
        required
        value={values.start_date}
        onChange={(event) => set("start_date", event.target.value)}
      />
      <FieldErrors id="event-start_date" errors={errors} name="start_date" />
      <Field
        {...props("end_date")}
        label="Fecha de finalización"
        type="date"
        value={values.end_date}
        onChange={(event) => set("end_date", event.target.value)}
      />
      <FieldErrors id="event-end_date" errors={errors} name="end_date" />
      <Field
        {...props("start_time")}
        label="Hora de inicio"
        type="time"
        value={values.start_time}
        onChange={(event) => set("start_time", event.target.value)}
      />
      <FieldErrors id="event-start_time" errors={errors} name="start_time" />
      <Field
        {...props("end_time")}
        label="Hora de finalización"
        type="time"
        value={values.end_time}
        onChange={(event) => set("end_time", event.target.value)}
      />
      <FieldErrors id="event-end_time" errors={errors} name="end_time" />
      {creating && (
        <SelectField
          {...props("is_active")}
          label="Estado"
          value={values.is_active ? "active" : "inactive"}
          onChange={(event) => set("is_active", event.target.value === "active")}
        >
          <option value="active">Activo</option>
          <option value="inactive">Inactivo</option>
        </SelectField>
      )}
      <DialogFormFooter
        error={error}
        busy={busy}
        submitLabel={creating ? "Crear evento" : "Guardar cambios"}
        onCancel={onCancel}
      />
    </form>
  );
}

function schedule(item: EventDto): string {
  const dates = item.end_date && item.end_date !== item.start_date
    ? `${formatDate(item.start_date)} – ${formatDate(item.end_date)}`
    : formatDate(item.start_date);
  const start = formatTime(item.start_time);
  const end = formatTime(item.end_time);
  const hours = start && end ? `${start} – ${end}` : start || end;

  return hours ? `${dates} · ${hours}` : dates;
}

export function EventsView({ state, actions }: EventsViewModel) {
  const { dialog } = state;
  const formDialog =
    dialog?.kind === "create" || dialog?.kind === "edit" ? dialog : null;
  const sectionError = dialog === null ? state.actionError : "";

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Eventos"
        description="Crea, edita y retira los eventos del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      {sectionError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {sectionError}
        </Alert>
      )}
      <div className="list-toolbar">
        <Button onClick={() => actions.openDialog({ kind: "create" })}>
          Crear evento
        </Button>
      </div>
      <ListStatusMessage
        status={state.status}
        error={state.error}
        loadingText="Cargando eventos…"
        emptyText="Aún no hay eventos registrados."
        onRetry={actions.reload}
      />
      {state.status === "ready" && (
        <section className="content-list" aria-labelledby="events-list-heading">
          <div className="list-heading">
            <div>
              <h2 id="events-list-heading">Eventos</h2>
              <p>{state.items.length} en total, activos e inactivos</p>
            </div>
          </div>
          <div className="event-card-grid">
            {state.items.map((item) => (
              <Card className="content-card" key={item.id}>
                <div className="content-card__body">
                  <div className="content-card__meta">
                    <Badge tone={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{schedule(item)}</p>
                  {item.location && <p>{item.location}</p>}
                  <div className="content-card__actions">
                    <Button
                      variant="secondary"
                      aria-label={`Editar el evento ${item.name}`}
                      onClick={() => actions.openDialog({ kind: "edit", item })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`${item.is_active ? "Desactivar" : "Activar"} el evento ${item.name}`}
                      onClick={() => actions.openDialog({ kind: "status", item })}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="danger"
                      aria-label={`Eliminar el evento ${item.name}`}
                      onClick={() => actions.openDialog({ kind: "delete", item })}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Dialog
        open={formDialog !== null}
        title={
          formDialog?.kind === "edit"
            ? "Editar evento"
            : formDialog?.kind === "create"
              ? "Crear evento"
              : "Formulario de evento"
        }
        onClose={actions.closeDialog}
        className="form-dialog"
      >
        {formDialog && (
          <EventForm
            key={formDialog.kind === "edit" ? `edit-${formDialog.item.id}` : "create"}
            item={formDialog.kind === "edit" ? formDialog.item : null}
            errors={state.fieldErrors}
            error={state.actionError}
            busy={state.saving}
            onSubmit={actions.save}
            onCancel={actions.closeDialog}
          />
        )}
      </Dialog>
      <ConfirmDialog
        copy={getEventConfirmation(dialog)}
        idleTitle="Confirmar acción sobre el evento"
        busy={state.saving}
        error={state.actionError}
        onConfirm={actions.confirm}
        onCancel={actions.closeDialog}
      />
    </>
  );
}
