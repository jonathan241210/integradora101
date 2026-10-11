import { useState, type FormEvent } from "react";
import { Alert, Badge, Button, Card, Field, SelectField, TextAreaField } from "@arca/ui";
import { DemoBanner } from "@/components/DemoBanner";
import { SectionHeading } from "@/components/SectionHeading";
import type { DemoEnclosure } from "@/data/demo-data";

export function EnclosuresView({
  enclosures,
  onUpdate,
}: {
  enclosures: DemoEnclosure[];
  onUpdate: (
    id: string,
    name: string,
    description: string,
    status: DemoEnclosure["status"],
  ) => void;
}) {
  const [formError, setFormError] = useState("");

  const saveEnclosure = (
    event: FormEvent<HTMLFormElement>,
    enclosure: DemoEnclosure,
  ) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = form.get("status");
    if (status !== "Abierto" && status !== "Cerrado") {
      setFormError("Selecciona un estado válido de la demostración.");
      return;
    }
    onUpdate(
      enclosure.id,
      String(form.get("name") ?? ""),
      String(form.get("description") ?? ""),
      status,
    );
    setFormError("");
  };

  return (
    <>
      <SectionHeading
        eyebrow="Administración / Recintos"
        title="Modificación de recintos"
        description="Edita datos ficticios para revisar cómo se vería la administración de recintos."
      />
      <DemoBanner />
      <Alert className="inline-feedback">
        Los cambios solo permanecen en esta página y desaparecen al recargar.
      </Alert>
      <div className="enclosure-grid">
        {enclosures.map((enclosure) => (
          <Card className="enclosure-card" key={enclosure.id}>
            <div className="card-heading">
              <div>
                <h2>{enclosure.name}</h2>
                <p>Recinto ficticio</p>
              </div>
              <Badge tone={enclosure.status === "Abierto" ? "success" : "neutral"}>
                {enclosure.status}
              </Badge>
            </div>
            <form
              className="enclosure-form"
              onSubmit={(event) => saveEnclosure(event, enclosure)}
            >
              <Field
                id={`enclosure-${enclosure.id}-name`}
                name="name"
                label="Nombre del recinto"
                defaultValue={enclosure.name}
                required
              />
              <TextAreaField
                id={`enclosure-${enclosure.id}-description`}
                name="description"
                label="Descripción"
                defaultValue={enclosure.description}
                required
              />
              <SelectField
                id={`enclosure-${enclosure.id}-status`}
                name="status"
                label="Estado de muestra"
                defaultValue={enclosure.status}
              >
                <option value="Abierto">Abierto</option>
                <option value="Cerrado">Cerrado</option>
              </SelectField>
              <Button type="submit">Guardar cambios de muestra</Button>
            </form>
          </Card>
        ))}
      </div>
      {formError && (
        <Alert className="inline-feedback" role="alert" aria-live="assertive">
          {formError}
        </Alert>
      )}
    </>
  );
}
