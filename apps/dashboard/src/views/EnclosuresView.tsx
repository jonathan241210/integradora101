import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Dialog, Field } from "@arca/ui";
import { FieldErrors, fieldErrorProps } from "@/components/FieldErrors";
import { DialogFormFooter } from "@/components/FormActions";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import type { EnclosureDto } from "@/viewmodels/admin-types";
import { formatCount } from "@/viewmodels/formatters";
import type { EnclosuresViewModel } from "@/viewmodels/enclosures-management";

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

export function EnclosuresView({ state, actions }: EnclosuresViewModel) {
  const { dialog } = state;
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
          {state.items.map((enclosure) => (
            <li key={enclosure.id}>
              <Card className="enclosure-card">
                <div className="card-heading">
                  <div>
                    <h2>{enclosure.name}</h2>
                    <p>
                      {formatCount(enclosure.animals_count)}{" "}
                      {enclosure.animals_count === 1 ? "animal" : "animales"}
                    </p>
                  </div>
                  <Badge tone="info">{formatCount(enclosure.animals_count)}</Badge>
                </div>
                <Button
                  variant="secondary"
                  aria-label={`Renombrar el recinto ${enclosure.name}`}
                  onClick={() => actions.openDialog({ kind: "rename", item: enclosure })}
                >
                  Renombrar
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialog !== null}
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
        {dialog && (
          <EnclosureForm
            key={dialog.kind === "rename" ? `rename-${dialog.item.id}` : "create"}
            enclosure={dialog.kind === "rename" ? dialog.item : null}
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
