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
import { formatDate } from "@/viewmodels/formatters";
import { visibleImageUrl } from "@/viewmodels/inline-content";
import { getNewsConfirmation, type NewsFormValues, type NewsViewModel } from "@/viewmodels/news-management";

export function NewsView({ state, actions }: NewsViewModel) {
  const { form, editing, fieldErrors: errors, pendingAction } = state;
  const editingNow = editing !== null;
  const { registerTrigger, noticeRef } = useInlineFocus({
    pendingAction,
    notice: state.notice,
    editing,
    firstFieldId: "news-title",
  });
  const set = <K extends keyof NewsFormValues>(field: K, value: NewsFormValues[K]) =>
    actions.changeForm({ [field]: value } as Partial<NewsFormValues>);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    actions.submit();
  };
  const props = (name: string) => ({
    id: `news-${name}`,
    ...fieldErrorProps(`news-${name}`, errors, name),
  });

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Noticias"
        description="Crea, edita y retira las noticias del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} focusRef={noticeRef} />
      {state.actionError && pendingAction === null && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {state.actionError}
        </Alert>
      )}

      <FormPanel
        id="news-form"
        title={editingNow ? `Editar noticia: ${editing.title}` : "Nueva noticia"}
        description="Título, categoría, contenido, fechas e imagen opcional."
        expanded={state.formExpanded}
        onToggle={actions.toggleForm}
      >
        <form className="form-grid form-grid--events inline-form" onSubmit={submit}>
          <FormField id="news-title" name="title" errors={errors} span="half">
            <Field
              {...props("title")}
              label="Título"
              required
              maxLength={200}
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </FormField>
          <FormField id="news-category" name="category" errors={errors} span="half">
            <Field
              {...props("category")}
              label="Categoría"
              required
              maxLength={100}
              value={form.category}
              onChange={(event) => set("category", event.target.value)}
            />
          </FormField>
          <FormField id="news-description" name="description" errors={errors} span="wide">
            <Field
              {...props("description")}
              label="Descripción breve"
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </FormField>
          <FormField id="news-content" name="content" errors={errors} span="wide">
            <TextAreaField
              {...props("content")}
              label="Contenido"
              required
              rows={6}
              value={form.content}
              onChange={(event) => set("content", event.target.value)}
            />
          </FormField>
          <FormField id="news-published_date" name="published_date" errors={errors}>
            <Field
              {...props("published_date")}
              label="Fecha de publicación"
              type="date"
              required
              value={form.published_date}
              onChange={(event) => set("published_date", event.target.value)}
            />
          </FormField>
          <FormField id="news-start_date" name="start_date" errors={errors}>
            <Field
              {...props("start_date")}
              label="Mostrar desde"
              type="date"
              value={form.start_date}
              onChange={(event) => set("start_date", event.target.value)}
            />
          </FormField>
          <FormField id="news-end_date" name="end_date" errors={errors}>
            <Field
              {...props("end_date")}
              label="Mostrar hasta"
              type="date"
              value={form.end_date}
              onChange={(event) => set("end_date", event.target.value)}
            />
          </FormField>
          {!editingNow && (
            <FormField id="news-is_active" name="is_active" errors={errors}>
              <SelectField
                {...props("is_active")}
                label="Estado"
                value={form.is_active ? "active" : "inactive"}
                onChange={(event) => set("is_active", event.target.value === "active")}
              >
                <option value="active">Activa</option>
                <option value="inactive">Inactiva</option>
              </SelectField>
            </FormField>
          )}
          <div className="form-field form-field--wide">
            <ImageUploadBox
              id="news-image"
              previewUrl={visibleImageUrl(editing, form.image)}
              previewAlt={form.title ? `Vista previa de la imagen de ${form.title}` : "Vista previa de la imagen"}
              error={form.image.error || (errors.image ?? []).join(" ")}
              onSelect={actions.chooseImage}
              onRemove={actions.removeImage}
            />
          </div>
          <InlineFormFooter
            error={state.formError}
            busy={state.saving}
            editing={editingNow}
            submitLabel={editingNow ? "Guardar cambios" : "Crear noticia"}
            onCancelEdit={actions.cancelEdit}
          />
        </form>
      </FormPanel>

      <ListStatusMessage
        status={state.status}
        error={state.error}
        loadingText="Cargando noticias…"
        emptyText="Aún no hay noticias registradas."
        onRetry={actions.reload}
      />
      {state.status === "ready" && (
        <section className="content-list" aria-labelledby="news-list-heading">
          <div className="list-heading">
            <div>
              <h2 id="news-list-heading">Noticias</h2>
              <p>{state.items.length} en total, activas e inactivas</p>
            </div>
          </div>
          <div className="content-card-grid">
            {state.items.map((item) => {
              const pending = pendingAction?.id === item.id ? pendingAction.type : null;

              return (
                <Card className="content-card" key={item.id}>
                  <ContentThumbnail url={item.image_url} name={item.title} />
                  <div className="content-card__body">
                    <div className="content-card__meta">
                      <Badge tone={item.is_active ? "success" : "neutral"}>
                        {item.is_active ? "Activa" : "Inactiva"}
                      </Badge>
                      <time dateTime={item.published_date}>{formatDate(item.published_date)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.description || item.category}</p>
                    <ContentCardActions
                      subject={`la noticia ${item.title}`}
                      isActive={item.is_active}
                      pending={pending}
                      copy={pending ? getNewsConfirmation(pending, item) : null}
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
