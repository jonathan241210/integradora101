import { Spinner } from '@/views/Spinner';
import { Alert, Badge, Button, Card, Field, SelectField } from '@arca/ui';
import type { SelectableSpeciesDto, SpeciesFichaField } from '@arca/api-client';
import { Icon } from '@/components/Icon';
import {
  ACCEPTED_PHOTO_TYPES,
  CORRECTIONS_HELP,
  NO_SPECIES_HELP,
  NO_SPECIES_SELECTED_MESSAGE,
  categoryOptions,
  fichaFieldOptions,
  isSelectable,
  lastRejectionNotice,
  requestTypeLabel,
  speciesStatusLabel,
  speciesStatusTone,
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
  photoPreview?: string | null;
  onChange: (patch: Partial<SpeciesRequestDraft>) => void;
  onToggleField: (key: SpeciesFichaField) => void;
  onImage: (file: File | null) => void;
  onReset: () => void;
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
  photoPreview,
  onChange,
  onToggleField,
  onImage,
  onReset,
  onSubmit,
}: SpeciesRequestFormPresenterProps) {
  const isUpdate = draft.requestType === 'update';
  const photoHint = isUpdate
    ? 'Sin foto nueva se mantiene la foto publicada.'
    : 'Obligatoria en la primera publicación. JPG o PNG, máximo 5 MB.';
  const noSpecies = selected === null;
  const disabled = busy || noSpecies || !isSelectable(selected) || selector.status !== 'ready';
  const rejection = selected ? lastRejectionNotice(selected) : null;

  return (
    <Card className="form-card species-request-form">
      <form
        className="data-form animal-form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {notice && <p role="status" className="species-request-form__notice">{notice}</p>}
        {general && <p role="alert" className="field-error">{general}</p>}

        <div className="species-request-pick">
          <SpeciesSelectorField {...selector} selectedId={draft.speciesId} error={errors.species_id} />
          <p className="field-help">{NO_SPECIES_HELP}</p>
          {selected && (
            <div className="species-summary">
              <p className="species-summary__line">
                <strong>Nombre común:</strong> <span>{selected.common_name}</span>
                <Badge tone={speciesStatusTone(selected.publication_status)}>
                  {speciesStatusLabel(selected.publication_status)}
                </Badge>
              </p>
              <p className="species-summary__line">
                <strong>Tipo de envío:</strong>{' '}
                <span>{requestTypeLabel(draft.requestType) || 'No disponible'}</span>
              </p>
              {rejection && (
                <Alert role="note" className="species-summary__notice">{rejection}</Alert>
              )}
            </div>
          )}
        </div>

        {noSpecies && (
          <p className="species-request-form__placeholder">{NO_SPECIES_SELECTED_MESSAGE}</p>
        )}

        <fieldset
          className="animal-form-container species-request-data"
          disabled={noSpecies}
        >
          <div className="animal-image-section">
            <div className="image-upload-area">
              {photoPreview ? (
                <div className="image-preview-container">
                  <img src={photoPreview} alt="Vista previa de la foto elegida" className="animal-preview" />
                  <button
                    type="button"
                    className="clear-image-btn"
                    title="Quitar foto"
                    aria-label="Quitar foto"
                    onClick={() => onImage(null)}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="image-upload-label" htmlFor="image">
                  <span className="upload-icon" aria-hidden="true"><Icon name="camera" size={40} /></span>
                  <span className="upload-text">Foto de la especie</span>
                </label>
              )}
              <input
                key={photoKey}
                id="image"
                name="image"
                type="file"
                className="visually-hidden-input"
                accept={ACCEPTED_PHOTO_TYPES.join(',')}
                onChange={(event) => onImage(event.target.files?.[0] ?? null)}
                aria-invalid={errors.image ? 'true' : undefined}
                aria-describedby={describedBy('image-hint', errors.image && 'image-error')}
              />
            </div>
            <span className="arca-field__hint" id="image-hint">{photoHint}</span>
            <FieldError id="image" message={errors.image} />
          </div>

          <div className="animal-form-fields">
            <div className="form-grid">
              <div>
                <Field
                  label="Nombre científico"
                  name="scientific_name"
                  value={draft.scientific_name}
                  maxLength={150}
                  onChange={(event) => onChange({ scientific_name: event.target.value })}
                  aria-invalid={errors.scientific_name ? 'true' : undefined}
                  aria-describedby={describedBy(errors.scientific_name && 'scientific_name-error')}
                />
                <FieldError id="scientific_name" message={errors.scientific_name} />
              </div>
              <div>
                <Field
                  label="Hábitat"
                  name="habitat"
                  value={draft.habitat}
                  maxLength={150}
                  onChange={(event) => onChange({ habitat: event.target.value })}
                  aria-invalid={errors.habitat ? 'true' : undefined}
                  aria-describedby={describedBy(errors.habitat && 'habitat-error')}
                />
                <FieldError id="habitat" message={errors.habitat} />
              </div>
              <div>
                <Field
                  label="Área de distribución natural"
                  name="origin"
                  value={draft.origin}
                  maxLength={150}
                  onChange={(event) => onChange({ origin: event.target.value })}
                  aria-invalid={errors.origin ? 'true' : undefined}
                  aria-describedby={describedBy(errors.origin && 'origin-error')}
                />
                <FieldError id="origin" message={errors.origin} />
              </div>
              <div>
                <SelectField
                  label="Tipo de animal"
                  name="category"
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
              </div>
            </div>
            <p className="field-help">{CORRECTIONS_HELP}</p>

            <fieldset
              className="ficha-fields"
              id="published_fields"
              tabIndex={-1}
              aria-describedby={describedBy('published_fields-help', errors.published_fields && 'published_fields-error')}
            >
              <legend>Qué mostrar en la ficha pública</legend>
              <div className="ficha-fields__grid">
                {fichaFieldOptions.map((option) => (
                  <label className="ficha-chip" key={option.key}>
                    <input
                      type="checkbox"
                      name="published_fields"
                      value={option.key}
                      checked={draft.publishedFields.includes(option.key)}
                      onChange={() => onToggleField(option.key)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
              <span className="field-help" id="published_fields-help">
                Nombre común, tipo de animal y foto siempre se muestran.
              </span>
              <FieldError id="published_fields" message={errors.published_fields} />
            </fieldset>
          </div>
        </fieldset>

        <div className="form-actions">
          <Button type="button" variant="secondary" disabled={busy} onClick={onReset}>Limpiar</Button>
          <Button type="submit" disabled={disabled}>
            {busy ? <Spinner label="Enviando solicitud…" /> : 'Enviar solicitud'}
          </Button>
        </div>
      </form>
    </Card>
  );
}
