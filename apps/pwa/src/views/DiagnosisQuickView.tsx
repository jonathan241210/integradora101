import { Card, Field, SelectField, TextAreaField } from '@arca/ui';
import type { FormEvent } from 'react';
import { createEvaluation } from '@/services/apiClient';
import { formToRecord, useSaveRequest } from '@/viewmodels/useApiData';
import { AnimalPicker } from '@/views/AnimalPicker';
import { SaveFeedback } from '@/views/SaveFeedback';
import { quickGroups, sexOptions } from '@/viewmodels/diagnosisForms';
import {
  PrintActions,
  PrintFooter,
  PrintHeader,
} from '@/views/DiagnosisPrint';

export function DiagnosisQuickView() {
  const save = useSaveRequest();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { 'quick-animal': animalId, ...values } = formToRecord(form);

    const saved = await save.run(
      () => createEvaluation('quick', Number(animalId), values),
      'Diagnóstico rápido guardado correctamente.',
    );

    if (saved) form.reset();
  }
  return (
    <section className="page-section printable-document">
      <div className="page-intro no-print">
        <p className="eyebrow">Atención veterinaria</p>
        <h2>Diagnóstico rápido</h2>
        <p>Formato de historia clínica con casillas.</p>
      </div>

      <Card className="form-card">
        <PrintHeader />
        <form className="data-form" id="quick-form" onSubmit={handleSubmit}>
          <h3>Formato de historia clínica</h3>
          <div className="form-grid">
            <AnimalPicker label="Animal" name="quick-animal" />
            <Field label="Motivo de la valoración clínica" name="quick-reason" />
            <Field label="Fecha" name="quick-date" type="date" />
          </div>
          <h4>Información del ejemplar</h4>
          <div className="form-grid">
            <Field label="Especie" name="quick-species" />
            <Field label="Edad (años)" min={0} name="quick-age" step="any" type="number" />
            <SelectField defaultValue="" label="Sexo" name="quick-sex">
              <option value="">Seleccionar</option>
              {sexOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </SelectField>
            <Field label="Peso (kg)" min={0} name="quick-weight" step="any" type="number" />
          </div>
          <h4>Examen físico general</h4>
          <div className="form-grid vitals-grid">
            <Field label="Frecuencia cardiaca (lat/min)" min={0} name="quick-heart-rate" step="1" type="number" />
            <Field label="Frecuencia respiratoria (resp/min)" min={0} name="quick-respiratory-rate" step="1" type="number" />
            <Field label="Temperatura (°C)" min={0} name="quick-temperature" step="0.1" type="number" />
          </div>
          <div className="form-grid">
            {quickGroups.map((group) => (
              <fieldset className="check-group form-full-width" key={group.name}>
                <legend>{group.label}</legend>
                {group.options.map((option) => (
                  <label key={option}>
                    <input
                      name={`quick-${group.name}-${option}`}
                      type="checkbox"
                    />{' '}
                    {option}
                  </label>
                ))}
                {group.name === 'body-condition' && (
                  <label>
                    Puntaje (1-5){' '}
                    <input
                      className="score-input"
                      max={5}
                      min={1}
                      name="quick-body-score"
                      type="number"
                    />
                  </label>
                )}
              </fieldset>
            ))}
            <TextAreaField className="form-full-width" label="Diagnóstico" name="quick-diagnosis" />
            <TextAreaField className="form-full-width" label="Recomendaciones" name="quick-recommendations" />
            <fieldset className="check-group form-full-width">
              <legend>¿El ejemplar se encuentra en condiciones óptimas para su liberación a vida silvestre?</legend>
              <label><input name="quick-release" type="radio" value="si" /> Sí</label>
              <label><input name="quick-release" type="radio" value="no" /> No</label>
            </fieldset>
          </div>
          <p className="print-signature">
            Nombre y firma del veterinario: ______________________
          </p>
        </form>
        <PrintFooter />
        <SaveFeedback message={save.message} status={save.status} />
        <PrintActions formId="quick-form" saving={save.saving} />
      </Card>
    </section>
  );
}
