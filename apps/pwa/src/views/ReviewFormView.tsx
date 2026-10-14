import { Alert, Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';

export function ReviewFormView() {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Seguimiento</p>
        <h2>Registrar revisión</h2>
        <p>Captura de muestra para control y seguimiento visual.</p>
      </div>

      <Card className="form-card">
        <Alert className="form-demo-note" role="note">
          Demostración: la revisión no se guarda ni se envía.
        </Alert>
        <form className="data-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <SelectField defaultValue="" label="Seleccionar animal" name="review-animal">
              <option disabled value="">Seleccionar animal</option>
              <option value="luna">Luna · Lobo mexicano</option>
              <option value="tlaloc">Tláloc · Jaguar</option>
              <option value="chuy">Chuy · Tapir de Baird</option>
            </SelectField>
            <SelectField defaultValue="" label="Motivo" name="review-reason">
              <option disabled value="">Seleccionar motivo</option>
              <option value="routine">Seguimiento rutinario</option>
              <option value="treatment">Control de tratamiento</option>
              <option value="observation">Observación</option>
            </SelectField>
            <SelectField defaultValue="" label="Estado del animal" name="review-status">
              <option disabled value="">Seleccionar estado</option>
              <option value="stable">Estable</option>
              <option value="monitoring">En observación</option>
              <option value="follow-up">Requiere seguimiento</option>
            </SelectField>
            <Field label="Próxima revisión" name="review-next-date" type="date" />
            <TextAreaField
              className="form-full-width"
              label="Observaciones"
              name="review-notes"
              placeholder="Hallazgos y notas"
            />
          </div>
          <div className="form-actions">
            <Button type="reset" variant="secondary">Limpiar</Button>
            <Button type="button">Guardar revisión</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
