import type { FormEvent } from "react";
import { Alert, Badge, Card, Field, SelectField, TextAreaField } from "@arca/ui";
import { ContentCardActions } from "@/components/ContentCardActions";
import { ContentThumbnail } from "@/components/ContentThumbnail";
import { fieldErrorProps } from "@/components/FieldErrors";
import { FormField } from "@/components/FormField";
import { FormPanel } from "@/components/FormPanel";
import { triggerKey, useInlineFocus } from "@/components/inline-focus";
import { ImageUploadBox } from "@/components/ImageUploadBox";
import { InlineFormFooter } from "@/components/InlineFormFooter";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { EventDto } from "@/viewmodels/admin-types";
import {
  getEventConfirmation,
  type EventFormValues,
  type EventsViewModel,
} from "@/viewmodels/events-management";
import { formatDate, formatTime } from "@/viewmodels/formatters";
import { visibleImageUrl } from "@/viewmodels/inline-content";

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
  const { form, editing, fieldErrors: errors, pendingAction } = state;
  const editingNow = editing !== null;
  const { registerTrigger, noticeRef } = useInlineFocus({
    pendingAction,
    notice: state.notice,
    editing,
    firstFieldId: "event-name",
  });
  const set = <K extends keyof EventFormValues>(field: K, value: EventFormValues[K]) =>
    actions.changeForm({ [field]: value } as Partial<EventFormValues>);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.submit();
  };
  const props = (name: string) => ({
    id: `event-${name}`,
    ...fieldErrorProps(`event-${name}`, errors, name),
  });

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Eventos"
        description="Crea, edita y retira los eventos del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} focusRef={noticeRef} />
      {state.actionError && pendingAction === null && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.actionError}
        </Alert>
      )}

      <FormPanel
        id="event-form"
        title={editingNow ? `Editar evento: ${editing.name}` : "Nuevo evento"}
        description="Nombre, fechas, horario, ubicación e imagen opcional."
        expanded={state.formExpanded}
        onToggle={actions.toggleForm}
      >
        <form className="form-grid form-grid--events inline-form" onSubmit={submit}>
          <FormField id="event-name" name="name" errors={errors} span="half">
            <Field
              {...props("name")}
              label="Nombre del evento"
              required
              maxLength={200}
              value={form.name}
              onChange={(event) => set("name", event.target.value)}
            />
          </FormField>
          <FormField id="event-location" name="location" errors={errors} span="half">
            <Field
              {...props("location")}
              label="Ubicación"
              maxLength={255}
              value={form.location}
              onChange={(event) => set("location", event.target.value)}
            />
          </FormField>
          <FormField id="event-description" name="description" errors={errors} span="wide">
            <TextAreaField
              {...props("description")}
              label="Descripción"
              rows={4}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </FormField>
          <FormField id="event-start_date" name="start_date" errors={errors}>
            <Field
              {...props("start_date")}
              label="Fecha de inicio"
              type="date"
              required
              value={form.start_date}
              onChange={(event) => set("start_date", event.target.value)}
            />
          </FormField>
          <FormField id="event-end_date" name="end_date" errors={errors}>
            <Field
              {...props("end_date")}
              label="Fecha de finalización"
              type="date"
              value={form.end_date}
              onChange={(event) => set("end_date", event.target.value)}
            />
          </FormField>
          <FormField id="event-start_time" name="start_time" errors={errors}>
            <Field
              {...props("start_time")}
              label="Hora de inicio"
              type="time"
              value={form.start_time}
              onChange={(event) => set("start_time", event.target.value)}
            />
          </FormField>
          <FormField id="event-end_time" name="end_time" errors={errors}>
            <Field
              {...props("end_time")}
              label="Hora de finalización"
              type="time"
              value={form.end_time}
              onChange={(event) => set("end_time", event.target.value)}
            />
          </FormField>
          {!editingNow && (
            <FormField id="event-is_active" name="is_active" errors={errors}>
              <SelectField
                {...props("is_active")}
                label="Estado"
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => set("is_active", event.target.value === "active")}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </SelectField>
            </FormField>
          )}
          <div className="form-field form-field--wide">
            <ImageUploadBox
              id="event-image"
              previewUrl={visibleImageUrl(editing, form.image)}
              previewAlt={form.name ? `Vista previa de la imagen de ${form.name}` : "Vista previa de la imagen"}
              error={form.image.error || (errors.image ?? []).join(" ")}
              onSelect={actions.chooseImage}
              onRemove={actions.removeImage}
            />
          </div>
          <InlineFormFooter
            error={state.formError}
            busy={state.saving}
            editing={editingNow}
            submitLabel={editingNow ? "Guardar cambios" : "Crear evento"}
            onCancelEdit={actions.cancelEdit}
          />
        </form>
      </FormPanel>

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
            {state.items.map((item) => {
              const pending = pendingAction?.id === item.id ? pendingAction.type : null;

              return (
                <Card className="content-card" key={item.id}>
                  <ContentThumbnail url={item.image_url} name={item.name} />
                  <div className="content-card__body">
                    <div className="content-card__meta">
                      <Badge tone={item.is_active ? "success" : "neutral"}>
                        {item.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <h3>{item.name}</h3>
                    <p>{schedule(item)}</p>
                    {item.location && <p>{item.location}</p>}
                    <ContentCardActions
                      subject={`el evento ${item.name}`}
                      isActive={item.is_active}
                      pending={pending}
                      copy={pending ? getEventConfirmation(pending, item) : null}
                      busy={state.actionBusy}
                      error={pending ? state.actionError : ""}
                      registerTrigger={(type) => registerTrigger(triggerKey({ type, id: item.id }))}
                      onEdit={() => actions.startEdit(item)}
                      onOpen={(type) => actions.openAction({ type, id: item.id })}
                      onConfirm={actions.confirmAction}
                      onCancel={actions.closeAction}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
