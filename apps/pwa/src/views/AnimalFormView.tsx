import { Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';
import type { FormEvent } from 'react';
import { createAnimal } from '@/services/apiClient';
import {
  formToRecord,
  useEnclosures,
  useSaveRequest,
  useSpeciesOptions,
} from '@/viewmodels/useApiData';
import { SaveFeedback } from '@/views/SaveFeedback';
import { Spinner } from '@/views/Spinner';

export function AnimalFormView() {
  const save = useSaveRequest();
  const {
    enclosures,
    loading: enclosuresLoading,
    error: enclosuresError,
    reload: reloadEnclosures,
  } = useEnclosures();
  const {
    species,
    loading: speciesLoading,
    error: speciesError,
    reload: reloadSpecies,
  } = useSpeciesOptions();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = formToRecord(form);
    const speciesInput = (values['animal-species'] ?? '').trim();

    if (speciesInput === '') {
      await save.run(async () => {
        throw new Error('Selecciona una especie del catálogo o ingresa el nombre de una nueva especie.');
      }, '');
      return;
    }

    const matched = species.find(
      (item) => item.common_name.toLowerCase() === speciesInput.toLowerCase(),
    );

    const saved = await save.run(async () => {
      await createAnimal({
        name: values['animal-name'],
        ...(matched ? { species_id: matched.id } : { species: speciesInput }),
        tag_number: values['animal-tag'],
        enclosure_id: Number(values['animal-enclosure']),
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
        <p>Completa los datos del ejemplar para registrarlo. Puedes elegir una especie existente o escribir una nueva.</p>
      </div>

      <Card className="form-card">
        <form className="data-form" onSubmit={handleSubmit}>
          <SaveFeedback message={save.message} status={save.status} />
          <div className="form-grid">
            <Field label="Nombre" name="animal-name" placeholder="Ej. Tláloc" required />
            <Field
              label="Especie"
              name="animal-species"
              placeholder="Ej. Jaguar"
              list="species-options"
              required
              helperText="Elige una especie del catálogo o escribe el nombre de una nueva."
            />
            <datalist id="species-options">
              {species.map((item) => (
                <option key={item.id} value={item.common_name} />
              ))}
            </datalist>
            {speciesLoading && <Spinner label="Cargando especies…" />}
            {speciesError && (
              <p className="form-full-width" role="alert">
                {speciesError}{' '}
                <button onClick={reloadSpecies} type="button">Reintentar</button>
              </p>
            )}
            <Field
              label="Identificación (marca, anillo o chip)"
              name="animal-tag"
              placeholder="Ej. JAG-001"
              required
            />
            <SelectField
              defaultValue=""
              disabled={enclosuresLoading || Boolean(enclosuresError) || enclosures.length === 0}
              label="Recinto"
              name="animal-enclosure"
              required
            >
              <option disabled value="">
                {enclosuresLoading ? 'Cargando recintos…' : 'Seleccionar recinto'}
              </option>
              {enclosures.map((enclosure) => (
                <option key={enclosure.id} value={enclosure.id}>{enclosure.name}</option>
              ))}
            </SelectField>
            {enclosuresLoading && <Spinner label="Cargando recintos…" />}
            {enclosuresError && (
              <p className="form-full-width" role="alert">
                {enclosuresError}{' '}
                <button onClick={reloadEnclosures} type="button">Reintentar</button>
              </p>
            )}
            {!enclosuresLoading && !enclosuresError && enclosures.length === 0 && (
              <p className="form-full-width" role="alert">
                No hay recintos disponibles para registrar el animal.
              </p>
            )}
            <SelectField defaultValue="" label="Sexo" name="animal-sex" required>
              <option disabled value="">Seleccionar</option>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
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
            <Button
              disabled={save.saving || enclosuresLoading || Boolean(enclosuresError) || enclosures.length === 0}
              type="submit"
              variant="primary"
            >
              {save.saving ? <Spinner label="Cargando…" /> : 'Registrar animal'}
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
