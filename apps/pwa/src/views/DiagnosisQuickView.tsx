import { Button, Card, Dialog, Field, SelectField, TextAreaField } from '@arca/ui';
import { useEffect, useState, type FormEvent } from 'react';
import { createEvaluation, type AnimalSummary } from '@/services/apiClient';
import { formToRecord, useSaveRequest } from '@/viewmodels/useApiData';
import { AnimalPicker } from '@/views/AnimalPicker';
import { SaveFeedback } from '@/views/SaveFeedback';
import { quickGroups } from '@/viewmodels/diagnosisForms';
import {
  PrintActions,
  PrintFooter,
  PrintHeader,
} from '@/views/DiagnosisPrint';

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

export function DiagnosisQuickView({ mvzName = '' }: { mvzName?: string }) {
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalSummary | null>(null);
  const [mvz, setMvz] = useState(mvzName);
  const [species, setSpecies] = useState('');
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
      setSpecies('');
      setSex('');
      setAge('');
      return;
    }
    setSpecies(selectedAnimal.species ?? '');
    setSex(sexLabel(selectedAnimal.sex));
    setAge(calculateAge(selectedAnimal.birth_date));
  }, [selectedAnimal]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { 'quick-animal': animalId, ...values } = formToRecord(form);

    if (!animalId) {
      await save.run(() => Promise.reject(new Error('Selecciona un animal antes de guardar.')), '');
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
      () => createEvaluation('quick', pending.animalId, payload),
      'Diagnóstico rápido guardado correctamente.',
    );
    if (saved) {
      form?.reset();
      setSelectedAnimal(null);
      setMvz(mvzName);
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
        <h2>Diagnóstico rápido</h2>
        <p>Formato de historia clínica con casillas.</p>
      </div>

      <Card className="form-card">
        <PrintHeader />
        <form
          className="data-form"
          id="quick-form"
          onSubmit={handleSubmit}
          onReset={() => {
            setSelectedAnimal(null);
            setMvz(mvzName);
          }}
        >
          <h3>Formato de historia clínica</h3>
          <div className="form-grid">
            <AnimalPicker label="Animal" name="quick-animal" onSelect={setSelectedAnimal} />
            <Field label="MVZ" name="quick-mvz" value={mvz} onChange={(e) => setMvz(e.target.value)} />
            <Field label="Motivo de la valoración clínica" name="quick-reason" />
            <Field label="Fecha" name="quick-date" type="date" defaultValue={today} />
          </div>
          <h4>Información del ejemplar</h4>
          <div className="form-grid">
            <Field label="Especie" name="quick-species" value={species} onChange={(e) => setSpecies(e.target.value)} />
            <Field label="Edad" name="quick-age" value={age} onChange={(e) => setAge(e.target.value)} list="quick-age-categories" />
            <datalist id="quick-age-categories">
              <option value="Neonato" />
              <option value="Cría" />
              <option value="Juvenil" />
              <option value="Adulto" />
              <option value="Geriátrico" />
            </datalist>
            <Field label="Sexo" name="quick-sex" value={sex} onChange={(e) => setSex(e.target.value)} list="quick-sex-options" />
            <datalist id="quick-sex-options">
              <option value="Hembra" />
              <option value="Macho" />
            </datalist>
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
              onClick={() => void confirmSave(document.getElementById('quick-form') as HTMLFormElement | null)}
            >
              Confirmar guardado
            </Button>
          </div>
        </Dialog>
      </Card>
    </section>
  );
}
