import { Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';
import type { FormEvent } from 'react';
import { createEvaluation } from '@/services/apiClient';
import { formToRecord, useSaveRequest } from '@/viewmodels/useApiData';
import { AnimalPicker } from '@/views/AnimalPicker';
import { SaveFeedback } from '@/views/SaveFeedback';

export function ReviewFormView() {
  const save = useSaveRequest();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formToRecord(form);

    const saved = await save.run(
      () =>
        createEvaluation('review', Number(values['review-animal']), {
          reason: values['review-reason'] ?? '',
          status: values['review-status'] ?? '',
          next_date: values['review-next-date'] ?? '',
          notes: values['review-notes'] ?? '',
        }),
      'Revisión guardada correctamente.',
    );

    if (saved) form.reset();
  }

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Seguimiento</p>
        <h2>Registrar revisión</h2>
        <p>Captura el seguimiento de un animal registrado.</p>
      </div>

      <Card className="form-card">
        <form className="data-form" onSubmit={handleSubmit}>
          <SaveFeedback message={save.message} status={save.status} />
          <div className="form-grid">
            <AnimalPicker label="Seleccionar animal" name="review-animal" />
            <SelectField defaultValue="" label="Motivo" name="review-reason" required>
              <option disabled value="">Seleccionar motivo</option>
              <option value="routine">Seguimiento rutinario</option>
              <option value="treatment">Control de tratamiento</option>
              <option value="observation">Observación</option>
            </SelectField>
            <SelectField defaultValue="" label="Estado del animal" name="review-status" required>
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
            <Button disabled={save.saving} type="submit">
              {save.saving ? 'Guardando…' : 'Guardar revisión'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
