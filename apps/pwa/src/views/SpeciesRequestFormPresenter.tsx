import { Spinner } from '@/views/Spinner';
import { Alert, Badge, Button, Card, Field, SelectField, TextAreaField } from '@arca/ui';
import type { SelectableSpeciesDto, SpeciesFichaField } from '@arca/api-client';
import { Icon } from '@/components/Icon';
import {
  ACCEPTED_PHOTO_TYPES,
  CORRECTIONS_HELP,
  NO_SPECIES_HELP,
  FICHA_HELP,
  FIXED_FIELD_LEGEND,
  NO_SPECIES_SELECTED_MESSAGE,
  categoryOptions,
  fichaFieldOptions,
  fixedFichaLabels,
  isFichaFieldVisible,
  isSelectable,
  lastRejectionNotice,
  notPublishedLine,
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

        <section className="form-step species-request-pick" aria-labelledby="step-species">
          <h3 className="form-step__title" id="step-species"><span className="form-step__num" aria-hidden="true">1</span>Especie</h3>
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
        </section>

        {noSpecies && (
          <p className="species-request-form__placeholder">{NO_SPECIES_SELECTED_MESSAGE}</p>
        )}

        <fieldset
          className="species-request-data"
          disabled={noSpecies}
        >
          <section className="form-step" aria-labelledby="step-show">
            <h3 className="form-step__title" id="step-show"><span className="form-step__num" aria-hidden="true">2</span>Qué mostrar en la ficha pública</h3>
            <fieldset
              className="ficha-fields"
              id="published_fields"
              tabIndex={-1}
              aria-labelledby="step-show"
              aria-describedby={describedBy('published_fields-help', errors.published_fields && 'published_fields-error')}
            >
              <span className="field-help" id="published_fields-help">{FICHA_HELP}</span>
              <div className="ficha-fields__grid">
                {fichaFieldOptions.map((option) => (
                  <label className="ficha-chip" key={option.key}>
                    <input
                      id={`ficha-chip-${option.key}`}
                      type="checkbox"
                      name="published_fields"
                      value={option.key}
                      checked={isFichaFieldVisible(draft, option.key)}
                      onChange={(event) => {
                        const chip = event.currentTarget;
                        onToggleField(option.key);
                        chip.focus();
                      }}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                {fixedFichaLabels.map((label) => (
                  <label className="ficha-chip ficha-chip--fixed" key={label}>
                    <input type="checkbox" checked disabled readOnly />
                    <span className="ficha-chip__icon" aria-hidden="true"><Icon name="lock" size={14} /></span>
                    <span>
                      {label}
                      <small className="ficha-chip__legend">{FIXED_FIELD_LEGEND}</small>
                    </span>
                  </label>
                ))}
              </div>
              <FieldError id="published_fields" message={errors.published_fields} />
            </fieldset>
          </section>

          <section className="form-step" aria-labelledby="step-data">
            <h3 className="form-step__title" id="step-data"><span className="form-step__num" aria-hidden="true">3</span>Datos de la ficha</h3>
            <div className="animal-form-container">
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
                  {fichaFieldOptions.filter((option) => isFichaFieldVisible(draft, option.key)).map((option) => (
                    <div key={option.key} className={option.multiline ? 'species-request-form__wide' : undefined}>
                      {option.multiline ? (
                        <>
                          <TextAreaField
                            label={option.label}
                            name={option.key}
                            rows={4}
                            value={draft[option.key]}
                            maxLength={option.maxLength}
                            onChange={(event) => onChange({ [option.key]: event.target.value })}
                            aria-invalid={errors[option.key] ? 'true' : undefined}
                            aria-describedby={describedBy(`${option.key}-help`, errors[option.key] && `${option.key}-error`)}
                          />
                          <p className="field-help" id={`${option.key}-help`}>
                            {option.help} <span aria-live="polite">{draft[option.key].length}/{option.maxLength}</span>
                          </p>
                        </>
                      ) : (
                      <Field
                        label={option.label}
                        name={option.key}
                        value={draft[option.key]}
                        maxLength={option.maxLength}
                        onChange={(event) => onChange({ [option.key]: event.target.value })}
                        aria-invalid={errors[option.key] ? 'true' : undefined}
                        aria-describedby={describedBy(errors[option.key] && `${option.key}-error`)}
                      />
                      )}
                      <FieldError id={option.key} message={errors[option.key]} />
                    </div>
                  ))}
                </div>
                <p className="field-help">{CORRECTIONS_HELP}</p>
                <p className="field-help species-request-form__hidden-line" aria-live="polite">{notPublishedLine(draft)}</p>
              </div>
            </div>
          </section>
        </fieldset>

        <section className="form-step" aria-labelledby="step-send">
          <h3 className="form-step__title" id="step-send"><span className="form-step__num" aria-hidden="true">4</span>Enviar</h3>
          <div className="form-actions">
            <Button type="button" variant="secondary" disabled={busy} onClick={onReset}>Limpiar</Button>
            <Button type="submit" disabled={disabled}>
              {busy ? <Spinner label="Enviando solicitud…" /> : 'Enviar solicitud'}
            </Button>
          </div>
        </section>
      </form>
    </Card>
  );
}
