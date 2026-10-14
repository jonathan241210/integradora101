import { Alert, Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';

export function AnimalFormView() {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Nuevo ejemplar</p>
        <h2>Registrar animal</h2>
        <p>Completa los datos de muestra para visualizar el formulario.</p>
      </div>

      <Card className="form-card">
        <Alert className="form-demo-note" role="note">
          Este formulario es solo visual. La información no se guarda.
        </Alert>
        <form className="data-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <Field label="Nombre" name="animal-name" placeholder="Ej. Tláloc" />
            <Field label="Especie" name="animal-species" placeholder="Ej. Jaguar" />
            <SelectField defaultValue="" label="Sexo" name="animal-sex">
              <option disabled value="">Seleccionar</option>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
              <option value="unknown">No identificado</option>
            </SelectField>
            <Field label="Fecha de nacimiento" name="animal-birth-date" type="date" />
            <SelectField defaultValue="" label="Origen" name="animal-origin">
              <option disabled value="">Seleccionar</option>
              <option value="rescue">Rescate</option>
              <option value="birth">Nacido en el zoológico</option>
              <option value="transfer">Traslado</option>
            </SelectField>
            <label className="photo-upload">
              <span>Fotografía</span>
              <span className="upload-control">
                <span aria-hidden="true">▧</span>
                Seleccionar fotografía
              </span>
              <input accept="image/*" aria-label="Seleccionar fotografía de muestra" type="file" />
            </label>
            <TextAreaField
              className="form-full-width"
              label="Observaciones"
              name="animal-notes"
              placeholder="Notas del ejemplar"
            />
          </div>
          <div className="form-actions">
            <Button type="reset" variant="secondary">Limpiar</Button>
            <Button type="button" variant="primary">Registrar animal</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
