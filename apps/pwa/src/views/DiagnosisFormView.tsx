import { Alert, Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';

export function DiagnosisFormView() {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Atención veterinaria</p>
        <h2>Registrar diagnóstico</h2>
        <p>Captura de muestra para revisión visual; no se envían datos clínicos.</p>
      </div>

      <Card className="form-card">
        <Alert className="form-demo-note" role="note">
          Demostración: el diagnóstico no se guarda ni se envía.
        </Alert>
        <form className="data-form" onSubmit={(event) => event.preventDefault()}>
          <div className="form-grid">
            <SelectField defaultValue="" label="Seleccionar animal" name="diagnosis-animal">
              <option disabled value="">Seleccionar animal</option>
              <option value="luna">Luna · Lobo mexicano</option>
              <option value="tlaloc">Tláloc · Jaguar</option>
              <option value="cuahtli">Cuahtli · Águila real</option>
            </SelectField>
            <Field label="Fecha" name="diagnosis-date" type="date" />
            <TextAreaField
              className="form-full-width"
              label="Síntomas observados"
              name="diagnosis-symptoms"
              placeholder="Describe los síntomas observados"
            />
            <Field label="Diagnóstico" name="diagnosis-summary" placeholder="Escribe el diagnóstico" />
            <Field label="Veterinario" name="diagnosis-veterinarian" placeholder="Nombre del veterinario" />
            <TextAreaField
              className="form-full-width"
              label="Observaciones"
              name="diagnosis-notes"
              placeholder="Notas adicionales"
            />
            <Field label="Próxima revisión" name="diagnosis-next-review" type="date" />
          </div>
          <div className="form-actions">
            <Button type="reset" variant="secondary">Limpiar</Button>
            <Button type="button">Guardar diagnóstico</Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
