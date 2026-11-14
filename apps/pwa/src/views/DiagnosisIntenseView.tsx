import { Button, Card, Dialog, Field, SelectField, TextAreaField } from '@arca/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { createEvaluation, type AnimalSummary } from '@/services/apiClient';
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
  ['medication', 'Medicamento', 'text'],
  ['dose-mg-kg', 'Dosis mg/kg', 'number'],
  ['dose-ml', 'Dosis en ml', 'number'],
  ['time', 'Hora de aplicación', 'time'],
  ['notes', 'Observaciones', 'text'],
] as const;

function sexLabel(sex: string | null | undefined): string {
  if (sex === 'F' || sex === 'hembra') return 'Hembra';
  if (sex === 'M' || sex === 'macho') return 'Macho';
  return sex ?? '';
}

function calculateAge(birthDate: string | null): string {
  if (!birthDate) return '';
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '';
  if (years === 0) return `${months} ${months === 1 ? 'mes' : 'meses'}`;
  if (months === 0) return `${years} ${years === 1 ? 'año' : 'años'}`;
  return `${years} ${years === 1 ? 'año' : 'años'} ${months} ${months === 1 ? 'mes' : 'meses'}`;
}



export function DiagnosisIntenseView({ mvzName = '' }: { mvzName?: string }) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalSummary | null>(null);
  const [mvz, setMvz] = useState(mvzName);
  const [patientName, setPatientName] = useState('');
  const [species, setSpecies] = useState('');
  const [identification, setIdentification] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const save = useSaveRequest();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState<{ animalId: number; values: Record<string, string> } | null>(null);
  const [followUpReason, setFollowUpReason] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState('');
  const [nextReviewDate, setNextReviewDate] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    setMvz(mvzName);
  }, [mvzName]);

  useEffect(() => {
    if (!selectedAnimal) {
      setPatientName('');
      setSpecies('');
      setIdentification('');
      setSex('');
      setAge('');
      return;
    }
    setPatientName(selectedAnimal.name ?? '');
    setSpecies(selectedAnimal.species ?? '');
    setIdentification(selectedAnimal.tag_number ?? '');
    setSex(sexLabel(selectedAnimal.sex));
    setAge(calculateAge(selectedAnimal.birth_date));
  }, [selectedAnimal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { 'intense-animal': animalId, ...values } = formToRecord(form);

    if (step !== 2) {
      await save.run(
        () => Promise.reject(new Error('Completa la parte 2 (evaluación clínica) antes de guardar el diagnóstico intenso.')),
        '',
      );
      return;
    }

    if (!animalId) {
      await save.run(
        () => Promise.reject(new Error('Selecciona un animal antes de guardar.')),
        '',
      );
      return;
    }

    if (!values['intense-date']) {
      await save.run(
        () => Promise.reject(new Error('Indica la fecha de la evaluación.')),
        '',
      );
      return;
    }

    const hasPartTwo = Boolean(
      values['intense-presumptive'] ||
      values['intense-definitive'] ||
      values['intense-vital-temp'] ||
      values['intense-vital-fr'] ||
      values['intense-vital-fc'] ||
      Object.keys(values).some((key) => key.startsWith('intense-eval-') && values[key]),
    );

    if (!hasPartTwo) {
      await save.run(
        () =>
          Promise.reject(
            new Error('Completa la evaluación clínica (parte 2) antes de guardar el diagnóstico intenso.'),
          ),
        '',
      );
      return;
    }

    setConfirmError('');
    setFollowUpReason('');
    setFollowUpStatus('');
    setNextReviewDate('');
    setPending({ animalId: Number(animalId), values });
    setConfirmOpen(true);
  }

  async function confirmSave(form: HTMLFormElement | null) {
    if (!pending) return;
    if (!followUpReason || !followUpStatus || !nextReviewDate) {
      setConfirmError('Completa el seguimiento obligatorio: motivo, estado y próxima revisión.');
      return;
    }
    const payload = {
      ...pending.values,
      follow_up_reason: followUpReason,
      follow_up_status: followUpStatus,
      next_review_date: nextReviewDate,
    };
    const saved = await save.run(
      () => createEvaluation('intense', pending.animalId, payload),
      'Diagnóstico intenso guardado correctamente.',
    );
    if (saved) {
      form?.reset();
      setSelectedAnimal(null);
      setStep(1);
      setPending(null);
      setConfirmOpen(false);
      setConfirmError('');
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <section className="page-section printable-document">
      <div className="page-intro no-print">
        <p className="eyebrow">Atención veterinaria</p>
        <h2>Diagnóstico intenso</h2>
        <p>Paso {step} de 2: {step === 1 ? 'Historia clínica del ejemplar' : 'Evaluación clínica'}.</p>
      </div>

      <Card className="form-card">
        <PrintHeader />
        <form
          className="data-form"
          id="intense-form"
          onSubmit={handleSubmit}
          onReset={() => {
            setSelectedAnimal(null);
            setMvz(mvzName);
          }}
        >
          <div className={step === 1 ? 'diagnosis-step' : 'diagnosis-step screen-hidden'}>
            <h3>Historia clínica del ejemplar</h3>
            <div className="form-grid">
              <AnimalPicker label="Animal" name="intense-animal" onSelect={setSelectedAnimal} />
              <Field
                label="MVZ"
                name="intense-mvz"
                value={mvz}
                onChange={(e) => setMvz(e.target.value)}
              />
              <Field label="Fecha" name="intense-date" type="date" defaultValue={today} />
            </div>
            <h4>Datos del paciente</h4>
            <div className="form-grid">
              <Field label="Nombre" name="intense-name" value={patientName} onChange={(e) => setPatientName(e.target.value)} />
              <Field label="Especie" name="intense-species" value={species} onChange={(e) => setSpecies(e.target.value)} />
              <Field label="Identificación" name="intense-identification" value={identification} onChange={(e) => setIdentification(e.target.value)} />
              <Field label="Edad" name="intense-age" value={age} onChange={(e) => setAge(e.target.value)} list="age-categories" />
              <datalist id="age-categories">
                <option value="Neonato" />
                <option value="Cría" />
                <option value="Juvenil" />
                <option value="Adulto" />
                <option value="Geriátrico" />
              </datalist>
              <Field label="Sexo" name="intense-sex" value={sex} onChange={(e) => setSex(e.target.value)} list="sex-options" />
              <datalist id="sex-options">
                <option value="Hembra" />
                <option value="Macho" />
              </datalist>
              <Field label="Peso (kg)" min={0} name="intense-weight" step="any" type="number" />
            </div>
            <h4>Anamnesis</h4>
            <fieldset className="check-group form-full-width">
              <legend>Tipo de movilización</legend>
              <label><input name="intense-mobilization-type-physical" type="checkbox" value="si" /> Física</label>
              <label><input name="intense-mobilization-type-chemical" type="checkbox" value="si" /> Química</label>
            </fieldset>
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
                      {restraintColumns.map(([key, label, type]) => (
                        <td key={key}>
                          <input
                            aria-label={`${label}, fila ${row + 1}`}
                            className="table-input"
                            min={type === 'number' ? 0 : undefined}
                            name={`intense-restraint-${row + 1}-${key}`}
                            step={type === 'number' ? 'any' : undefined}
                            type={type}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h4>Contención física</h4>
            <fieldset className="check-group form-full-width">
              <legend>Métodos aplicados</legend>
              {physicalRestraints.map((item) => (
                <label key={item.name}>
                  <input name={`intense-physical-${item.name}`} type="checkbox" value="si" /> {item.label}
                </label>
              ))}
            </fieldset>
            <TextAreaField
              className="form-full-width"
              label="Observaciones generales"
              name="intense-general-notes"
            />
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
                <Field
                  key={item.name}
                  label={item.label}
                  max={'max' in item ? item.max : undefined}
                  min={item.min}
                  name={`intense-vital-${item.name}`}
                  step={item.step}
                  type="number"
                />
              ))}
            </div>
            <h4>Sinología</h4>
            <div className="form-grid">
              <Field label="No. de animales afectados" min={0} name="intense-affected" step="1" type="number" />
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
        <Dialog
          open={confirmOpen}
          title="Confirmar guardado"
          onClose={() => {
            setConfirmOpen(false);
            setPending(null);
            setConfirmError('');
          }}
        >
          <p>Revisa los datos del diagnóstico. Como parte del proceso, completa el seguimiento antes de confirmar.</p>
          <div className="form-grid" style={{ marginTop: '0.75rem' }}>
            <SelectField
              label="Motivo de seguimiento"
              name="confirm-follow_up_reason"
              required
              value={followUpReason}
              onChange={(e) => setFollowUpReason(e.target.value)}
            >
              <option disabled value="">Seleccionar motivo</option>
              <option value="routine">Seguimiento rutinario</option>
              <option value="treatment">Control de tratamiento</option>
              <option value="observation">Observación</option>
            </SelectField>
            <SelectField
              label="Estado del animal"
              name="confirm-follow_up_status"
              required
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value)}
            >
              <option disabled value="">Seleccionar estado</option>
              <option value="stable">Estable</option>
              <option value="monitoring">En observación</option>
              <option value="follow_up">Requiere seguimiento</option>
            </SelectField>
            <Field
              label="Próxima revisión"
              name="confirm-next_review_date"
              type="date"
              required
              value={nextReviewDate}
              onChange={(e) => setNextReviewDate(e.target.value)}
            />
          </div>
          {confirmError && <p role="alert" style={{ color: 'var(--danger, #b91c1c)', marginTop: '0.5rem' }}>{confirmError}</p>}
          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setConfirmOpen(false);
                setPending(null);
                setConfirmError('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={save.saving}
              onClick={() => void confirmSave(document.getElementById('intense-form') as HTMLFormElement | null)}
            >
              Confirmar guardado
            </Button>
          </div>
        </Dialog>
      </Card>
    </section>
  );
}
