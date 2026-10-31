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
import type { NewsDto } from "@/viewmodels/admin-types";
import { formatDate } from "@/viewmodels/formatters";
import {
  emptyNewsForm,
  getNewsConfirmation,
  newsFormFromDto,
  type NewsFormValues,
  type NewsViewModel,
} from "@/viewmodels/news-management";

function NewsForm({
  item,
  errors,
  error,
  busy,
  onSubmit,
  onCancel,
}: {
  item: NewsDto | null;
  errors: Record<string, string[]>;
  error: string;
  busy: boolean;
  onSubmit: (values: NewsFormValues) => void;
  onCancel: () => void;
}) {
  const creating = item === null;
  const [values, setValues] = useState<NewsFormValues>(
    item ? newsFormFromDto(item) : emptyNewsForm(),
  );
  const set = <K extends keyof NewsFormValues>(field: K, value: NewsFormValues[K]) =>
    setValues((current) => ({ ...current, [field]: value }));
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(values);
  };
  const props = (name: string) => ({
    id: `news-${name}`,
    ...fieldErrorProps(`news-${name}`, errors, name),
  });

  return (
    <form className="dialog-form" onSubmit={submit}>
      <Field
        {...props("title")}
        label="Título"
        required
        maxLength={200}
        value={values.title}
        onChange={(event) => set("title", event.target.value)}
      />
      <FieldErrors id="news-title" errors={errors} name="title" />
      <Field
        {...props("category")}
        label="Categoría"
        required
        maxLength={100}
        value={values.category}
        onChange={(event) => set("category", event.target.value)}
      />
      <FieldErrors id="news-category" errors={errors} name="category" />
      <Field
        {...props("description")}
        label="Descripción breve"
        value={values.description}
        onChange={(event) => set("description", event.target.value)}
      />
      <FieldErrors id="news-description" errors={errors} name="description" />
      <TextAreaField
        {...props("content")}
        label="Contenido"
        required
        rows={6}
        value={values.content}
        onChange={(event) => set("content", event.target.value)}
      />
      <FieldErrors id="news-content" errors={errors} name="content" />
      <Field
        {...props("published_date")}
        label="Fecha de publicación"
        type="date"
        required
        value={values.published_date}
        onChange={(event) => set("published_date", event.target.value)}
      />
      <FieldErrors id="news-published_date" errors={errors} name="published_date" />
      <Field
        {...props("start_date")}
        label="Mostrar desde"
        type="date"
        value={values.start_date}
        onChange={(event) => set("start_date", event.target.value)}
      />
      <FieldErrors id="news-start_date" errors={errors} name="start_date" />
      <Field
        {...props("end_date")}
        label="Mostrar hasta"
        type="date"
        value={values.end_date}
        onChange={(event) => set("end_date", event.target.value)}
      />
      <FieldErrors id="news-end_date" errors={errors} name="end_date" />
      {creating && (
        <SelectField
          {...props("is_active")}
          label="Estado"
          value={values.is_active ? "active" : "inactive"}
          onChange={(event) => set("is_active", event.target.value === "active")}
        >
          <option value="active">Activa</option>
          <option value="inactive">Inactiva</option>
        </SelectField>
      )}
      <DialogFormFooter
        error={error}
        busy={busy}
        submitLabel={creating ? "Crear noticia" : "Guardar cambios"}
        onCancel={onCancel}
      />
    </form>
  );
}

export function NewsView({ state, actions }: NewsViewModel) {
  const { dialog } = state;
  const formDialog =
    dialog?.kind === "create" || dialog?.kind === "edit" ? dialog : null;
  const sectionError = dialog === null ? state.actionError : "";

  return (
    <>
      <SectionHeading
        eyebrow="Administración"
        title="Noticias"
        description="Crea, edita y retira las noticias del zoológico."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />
      {sectionError && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {sectionError}
        </Alert>
      )}
      <div className="list-toolbar">
        <Button onClick={() => actions.openDialog({ kind: "create" })}>
          Crear noticia
        </Button>
      </div>
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
            {state.items.map((item) => (
              <Card className="content-card" key={item.id}>
                <div className="content-card__body">
                  <div className="content-card__meta">
                    <Badge tone={item.is_active ? "success" : "neutral"}>
                      {item.is_active ? "Activa" : "Inactiva"}
                    </Badge>
                    <time dateTime={item.published_date}>{formatDate(item.published_date)}</time>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description || item.category}</p>
                  <div className="content-card__actions">
                    <Button
                      variant="secondary"
                      aria-label={`Editar la noticia ${item.title}`}
                      onClick={() => actions.openDialog({ kind: "edit", item })}
                    >
                      Editar
                    </Button>
                    <Button
                      variant="secondary"
                      aria-label={`${item.is_active ? "Desactivar" : "Activar"} la noticia ${item.title}`}
                      onClick={() => actions.openDialog({ kind: "status", item })}
                    >
                      {item.is_active ? "Desactivar" : "Activar"}
                    </Button>
                    <Button
                      variant="danger"
                      aria-label={`Eliminar la noticia ${item.title}`}
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
            ? "Editar noticia"
            : formDialog?.kind === "create"
              ? "Crear noticia"
              : "Formulario de noticia"
        }
        onClose={actions.closeDialog}
        className="form-dialog"
      >
        {formDialog && (
          <NewsForm
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
        copy={getNewsConfirmation(dialog)}
        idleTitle="Confirmar acción sobre la noticia"
        busy={state.saving}
        error={state.actionError}
        onConfirm={actions.confirm}
        onCancel={actions.closeDialog}
      />
    </>
  );
}
