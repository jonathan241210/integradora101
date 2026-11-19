import { Button, Card, Field, SelectField } from '@arca/ui';
import type { SelectableSpeciesDto, SpeciesFichaField } from '@arca/api-client';
import {
  ACCEPTED_PHOTO_TYPES,
  CORRECTIONS_HELP,
  NO_SPECIES_HELP,
  categoryOptions,
  fichaFieldOptions,
  isSelectable,
  requestTypeLabel,
  type FieldErrors,
  type SpeciesRequestDraft,
} from '@/viewmodels/speciesRequestForm';
import { SpeciesSelectorField, type SpeciesSelectorFieldProps } from '@/views/SpeciesSelectorField';

export type SpeciesRequestFormPresenterProps = {
  selector: Omit<SpeciesSelectorFieldProps, 'selectedId' | 'error'>;
  selected: SelectableSpeciesDto | null;
  draft: SpeciesRequestDraft;
  errors: FieldErrors;
  general: string;
  notice: string;
  busy: boolean;
  photoKey?: string;
  onChange: (patch: Partial<SpeciesRequestDraft>) => void;
  onToggleField: (key: SpeciesFichaField) => void;
  onImage: (file: File | null) => void;
  onSubmit: () => void;
};

function describedBy(...ids: (string | false | undefined)[]) {
  const value = ids.filter(Boolean).join(' ');
  return value || undefined;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <span className="field-error" id={`${id}-error`}>{message}</span> : null;
}

export function SpeciesRequestFormPresenter({
  selector,
  selected,
  draft,
  errors,
  general,
  notice,
  busy,
  photoKey,
  onChange,
  onToggleField,
  onImage,
  onSubmit,
}: SpeciesRequestFormPresenterProps) {
  const isUpdate = draft.requestType === 'update';
  const photoHint = isUpdate
    ? 'Sin foto nueva se mantiene la foto publicada.'
    : 'Obligatoria en la primera publicación. JPG o PNG, máximo 5 MB.';
  const noSpecies = selected === null;
  const disabled = busy || noSpecies || !isSelectable(selected) || selector.status !== 'ready';

  return (
    <Card className="form-card species-request-form">
      <form
        className="data-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {notice && <p role="status" className="species-request-form__notice">{notice}</p>}
        {general && <p role="alert" className="field-error">{general}</p>}

        <SpeciesSelectorField {...selector} selectedId={draft.speciesId} error={errors.species_id} />
        <p className="field-help">{NO_SPECIES_HELP}</p>

        {selected && (
          <p>
            <strong>Nombre común:</strong> {selected.common_name}
          </p>
        )}
        <p>
          <strong>Tipo de envío:</strong>{' '}
          {draft.requestType ? requestTypeLabel(draft.requestType) : 'Elige una especie para verlo.'}
        </p>

        <Field
          label="Nombre científico"
          name="scientific_name"
          disabled={noSpecies}
          value={draft.scientific_name}
          maxLength={150}
          onChange={(event) => onChange({ scientific_name: event.target.value })}
          aria-invalid={errors.scientific_name ? 'true' : undefined}
          aria-describedby={describedBy(errors.scientific_name && 'scientific_name-error')}
        />
        <FieldError id="scientific_name" message={errors.scientific_name} />
        <Field
          label="Hábitat"
          name="habitat"
          disabled={noSpecies}
          value={draft.habitat}
          maxLength={150}
          onChange={(event) => onChange({ habitat: event.target.value })}
          aria-invalid={errors.habitat ? 'true' : undefined}
          aria-describedby={describedBy(errors.habitat && 'habitat-error')}
        />
        <FieldError id="habitat" message={errors.habitat} />
        <Field
          label="Área de distribución natural"
          name="origin"
          disabled={noSpecies}
          value={draft.origin}
          maxLength={150}
          onChange={(event) => onChange({ origin: event.target.value })}
          aria-invalid={errors.origin ? 'true' : undefined}
          aria-describedby={describedBy(errors.origin && 'origin-error')}
        />
        <FieldError id="origin" message={errors.origin} />
        <p className="field-help">{CORRECTIONS_HELP}</p>

        <SelectField
          label="Tipo de animal"
          name="category"
          disabled={noSpecies}
          value={draft.category}
          onChange={(event) => onChange({ category: event.target.value as SpeciesRequestDraft['category'] })}
          aria-invalid={errors.category ? 'true' : undefined}
          aria-describedby={describedBy(errors.category && 'category-error')}
        >
          <option value="">Selecciona un tipo</option>
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </SelectField>
        <FieldError id="category" message={errors.category} />

        <Field
          label="Foto"
          key={photoKey}
          name="image"
          disabled={noSpecies}
          type="file"
          accept={ACCEPTED_PHOTO_TYPES.join(',')}
          hint={photoHint}
          onChange={(event) => onImage(event.target.files?.[0] ?? null)}
          aria-invalid={errors.image ? 'true' : undefined}
          aria-describedby={describedBy('image-hint', errors.image && 'image-error')}
        />
        <FieldError id="image" message={errors.image} />

        <fieldset
          className="ficha-fields"
          id="published_fields"
          tabIndex={-1}
          aria-describedby={describedBy('published_fields-help', errors.published_fields && 'published_fields-error')}
        >
          <legend>Qué mostrar en la ficha pública</legend>
          {fichaFieldOptions.map((option) => (
            <label className="ficha-fields__option" key={option.key}>
              <input
                type="checkbox"
                name="published_fields"
                disabled={noSpecies}
                value={option.key}
                checked={draft.publishedFields.includes(option.key)}
                onChange={() => onToggleField(option.key)}
              />
              <span>{option.label}</span>
            </label>
          ))}
          <span className="field-help" id="published_fields-help">
            Nombre común, tipo de animal y foto siempre se muestran.
          </span>
          <FieldError id="published_fields" message={errors.published_fields} />
        </fieldset>

        <Button type="submit" disabled={disabled}>
          {busy ? 'Enviando…' : 'Enviar solicitud'}
        </Button>
      </form>
    </Card>
  );
}
