import { Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';
import type { FormEvent } from 'react';
import { createAnimal } from '@/services/apiClient';
import { formToRecord, useSaveRequest } from '@/viewmodels/useApiData';
import { SaveFeedback } from '@/views/SaveFeedback';

export function AnimalFormView() {
  const save = useSaveRequest();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formToRecord(form);

    const saved = await save.run(async () => {
      await createAnimal({
        name: values['animal-name'],
        species: values['animal-species'],
        tag_number: values['animal-tag'],
        sex: values['animal-sex'],
        birth_date: values['animal-birth-date'] || undefined,
        origin: values['animal-origin'] || undefined,
        notes: values['animal-notes'] || undefined,
      });
    }, 'Animal registrado correctamente.');

    if (saved) form.reset();
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Nuevo ejemplar</p>
        <h2>Registrar animal</h2>
        <p>Completa los datos del ejemplar para registrarlo.</p>
      </div>

      <Card className="form-card">
        <form className="data-form" onSubmit={handleSubmit}>
          <SaveFeedback message={save.message} status={save.status} />
          <div className="form-grid">
            <Field label="Nombre" name="animal-name" placeholder="Ej. Tláloc" required />
            <Field label="Especie" name="animal-species" placeholder="Ej. Jaguar" required />
            <Field
              label="Identificación (marca, anillo o chip)"
              name="animal-tag"
              placeholder="Ej. JAG-001"
              required
            />
            <SelectField defaultValue="" label="Sexo" name="animal-sex" required>
              <option disabled value="">Seleccionar</option>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
              <option value="unknown">No identificado</option>
            </SelectField>
            <Field label="Fecha de nacimiento" name="animal-birth-date" type="date" />
            <SelectField defaultValue="" label="Origen" name="animal-origin">
              <option value="">Sin especificar</option>
              <option value="rescue">Rescate</option>
              <option value="birth">Nacido en el zoológico</option>
              <option value="transfer">Traslado</option>
            </SelectField>
            <TextAreaField
              className="form-full-width"
              label="Observaciones"
              name="animal-notes"
              placeholder="Notas del ejemplar"
            />
          </div>
          <div className="form-actions">
            <Button type="reset" variant="secondary">Limpiar</Button>
            <Button disabled={save.saving} type="submit" variant="primary">
              {save.saving ? 'Guardando…' : 'Registrar animal'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
