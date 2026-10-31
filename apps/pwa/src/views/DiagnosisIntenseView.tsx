import { Button, Card, Field, TextAreaField } from '@arca/ui';
import { useState, type FormEvent } from 'react';
import { createEvaluation } from '@/services/apiClient';
import { formToRecord, useSaveRequest } from '@/viewmodels/useApiData';
import { AnimalPicker } from '@/views/AnimalPicker';
import { SaveFeedback } from '@/views/SaveFeedback';
import {
  chemicalRestraintRows,
  intenseSystems,
  intenseVitals,
  physicalRestraints,
  sampleTypes,
} from '@/viewmodels/diagnosisForms';
import {
  PrintActions,
  PrintFooter,
  PrintHeader,
} from '@/views/DiagnosisPrint';

const restraintColumns = [
  ['medication', 'Medicamento'],
  ['dose-mg-kg', 'Dosis mg/kg'],
  ['dose-ml', 'Dosis en ml'],
  ['time', 'Hora de aplicación'],
  ['notes', 'Observaciones'],
] as const;

export function DiagnosisIntenseView() {
  const [step, setStep] = useState<1 | 2>(1);
  const save = useSaveRequest();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { 'intense-animal': animalId, ...values } = formToRecord(form);

    const saved = await save.run(
      () => createEvaluation('intense', Number(animalId), values),
      'Diagnóstico intenso guardado correctamente.',
    );

    if (saved) {
      form.reset();
      setStep(1);
    }
  }

  return (
    <section className="page-section printable-document">
      <div className="page-intro no-print">
        <p className="eyebrow">Atención veterinaria</p>
        <h2>Diagnóstico intenso</h2>
        <p>Paso {step} de 2: {step === 1 ? 'Historia clínica del ejemplar' : 'Evaluación clínica'}.</p>
      </div>

      <Card className="form-card">
        <PrintHeader />
        <form className="data-form" id="intense-form" onSubmit={handleSubmit}>
          <div className={step === 1 ? 'diagnosis-step' : 'diagnosis-step screen-hidden'}>
            <h3>Historia clínica del ejemplar</h3>
            <div className="form-grid">
              <AnimalPicker label="Animal" name="intense-animal" />
              <Field label="MVZ" name="intense-mvz" />
              <Field label="Fecha" name="intense-date" type="date" />
            </div>
            <h4>Datos del paciente</h4>
            <div className="form-grid">
              <Field label="Nombre" name="intense-name" />
              <Field label="Especie" name="intense-species" />
              <Field label="Identificación" name="intense-identification" />
              <Field label="Edad" name="intense-age" />
              <Field label="Sexo" name="intense-sex" />
              <Field label="Peso" name="intense-weight" />
            </div>
            <h4>Anamnesis</h4>
            <div className="form-grid">
              <Field label="Movilización física" name="intense-mobilization-physical" />
              <Field label="Movilización química" name="intense-mobilization-chemical" />
            </div>
            <h4>Contención química</h4>
            <div className="table-scroll">
              <table className="print-table">
                <thead>
                  <tr>
                    {restraintColumns.map(([key, label]) => (
                      <th key={key} scope="col">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: chemicalRestraintRows }, (_, row) => (
                    <tr key={row}>
                      {restraintColumns.map(([key, label]) => (
                        <td key={key}>
                          <input
                            aria-label={`${label}, fila ${row + 1}`}
                            className="table-input"
                            name={`intense-restraint-${row + 1}-${key}`}
                            type="text"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4>Contención física</h4>
            <div className="form-grid">
              {physicalRestraints.map((item) => (
                <Field key={item.name} label={item.label} name={`intense-physical-${item.name}`} />
              ))}
              <TextAreaField
                className="form-full-width"
                label="Observaciones generales"
                name="intense-general-notes"
              />
            </div>
          </div>

          <div className={step === 2 ? 'diagnosis-step' : 'diagnosis-step screen-hidden'}>
            <h3>Evaluación clínica</h3>
            <div className="form-grid">
              {intenseSystems.map((item) => (
                <Field key={item.name} label={item.label} name={`intense-eval-${item.name}`} />
              ))}
            </div>
            <div className="form-grid vitals-grid">
              {intenseVitals.map((item) => (
                <Field key={item.name} label={item.label} name={`intense-vital-${item.name}`} />
              ))}
            </div>
            <h4>Sinología</h4>
            <div className="form-grid">
              <Field label="No. de animales afectados" name="intense-affected" />
              <fieldset className="check-group">
                <legend>Toma de muestra</legend>
                <label><input name="intense-sample" type="radio" value="si" /> Sí</label>
                <label><input name="intense-sample" type="radio" value="no" /> No</label>
              </fieldset>
              <fieldset className="check-group form-full-width">
                <legend>Tipo de muestra</legend>
                {sampleTypes.map((item) => (
                  <label key={item.name}>
                    <input name={`intense-sample-${item.name}`} type="checkbox" /> {item.label}
                  </label>
                ))}
              </fieldset>
              <Field label="Biopsia" name="intense-biopsy" />
              <Field label="Rayos X" name="intense-xray" />
              <Field className="form-full-width" label="Muestra de laboratorio" name="intense-lab" />
              <TextAreaField className="form-full-width" label="Diagnóstico presuntivo" name="intense-presumptive" />
              <TextAreaField className="form-full-width" label="Diagnóstico definitivo" name="intense-definitive" />
            </div>
          </div>
        </form>
        <PrintFooter />
        <SaveFeedback message={save.message} status={save.status} />
        <PrintActions formId="intense-form" saving={save.saving}>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} type="button" variant="secondary">
              Siguiente: evaluación clínica
            </Button>
          ) : (
            <Button onClick={() => setStep(1)} type="button" variant="secondary">
              Anterior: historia clínica
            </Button>
          )}
        </PrintActions>
      </Card>
    </section>
  );
}
