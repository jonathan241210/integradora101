import type { FormEvent } from "react";
import { Alert, Button, Field, SelectField } from "@arca/ui";
import { FieldErrors, fieldErrorProps, type FieldErrorMap } from "./FieldErrors";
import { SpeciesPhoto } from "./SpeciesPhoto";
import type { SpeciesFichaField } from "@/viewmodels/admin-types";
import {
  EMPTY_CORRECTION_HINT,
  PHOTO_ACCEPT_ATTRIBUTE,
  categoryLabels,
  categoryOptions,
  fichaFieldOptions,
  originLabel,
  type SpeciesSheetDraft,
} from "@/viewmodels/species-publication-shared";
import type { PhotoSlot } from "@/viewmodels/species-requests";

/**
 * Formulario de ficha compartido por la edición de una solicitud y la de una
 * especie despublicada (CA-07, CA-55). El nombre común es solo texto
 * (RN-15). La foto elegida se ve antes de guardar y no se sube (CA-49).
 */
export function SpeciesFichaForm({
  idPrefix,
  commonName,
  draft,
  fieldErrors,
  currentPhoto,
  newPhoto,
  busy,
  error,
  submitLabel,
  onChange,
  onToggleField,
  onChoosePhoto,
  onClearPhoto,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  commonName: string;
  draft: SpeciesSheetDraft;
  fieldErrors: FieldErrorMap;
  currentPhoto: PhotoSlot;
  newPhoto: { file: File | null; previewUrl: string; error: string };
  busy: boolean;
  error: string;
  submitLabel: string;
  onChange: (changes: Partial<SpeciesSheetDraft>) => void;
  onToggleField: (key: SpeciesFichaField) => void;
  onChoosePhoto: (file: File) => void;
  onClearPhoto: () => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const text = (name: "scientific_name" | "habitat" | "origin", label: string) => (
    <div className="form-field form-field--half">
      <Field
        id={id(name)}
        name={name}
        label={label}
        value={draft[name]}
        hint={EMPTY_CORRECTION_HINT}
        onChange={(event) => onChange({ [name]: event.target.value })}
        {...fieldErrorProps(id(name), fieldErrors, name)}
      />
      <FieldErrors id={id(name)} errors={fieldErrors} name={name} />
    </div>
  );
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!busy) onSubmit();
  };
  const photoError = newPhoto.error || (fieldErrors.image ?? []).join(" ");

  return (
    <form
      className="species-form"
      onSubmit={submit}
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <p className="species-form__common">
        <span>Nombre común (no editable)</span>
        <strong>{commonName}</strong>
      </p>
      <div className="form-grid species-form__grid">
        {text("scientific_name", "Nombre científico")}
        {text("habitat", "Hábitat")}
        {text("origin", originLabel)}
        <div className="form-field form-field--half">
          <SelectField
            id={id("category")}
            name="category"
            label="Tipo de animal"
            required
            value={draft.category}
            onChange={(event) =>
              onChange({ category: event.target.value as SpeciesSheetDraft["category"] })
            }
            {...fieldErrorProps(id("category"), fieldErrors, "category")}
          >
            <option value="">Elige un tipo</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </SelectField>
          <FieldErrors id={id("category")} errors={fieldErrors} name="category" />
        </div>
      </div>

      <fieldset className="species-form__fichas">
        <legend>Qué mostrar en la ficha pública</legend>
        {fichaFieldOptions.map((option) => (
          <label className="species-form__check" key={option.key}>
            <input
              type="checkbox"
              checked={draft.published_fields.includes(option.key)}
              onChange={() => onToggleField(option.key)}
            />
            {option.label}
          </label>
        ))}
        <FieldErrors id={id("published-fields")} errors={fieldErrors} name="published_fields" />
      </fieldset>

      <div className="species-form__photos">
        <div>
          <h3>Foto actual</h3>
          <SpeciesPhoto
            slot={currentPhoto}
            alt={`Foto de ${commonName}`}
            noneText="Sin foto publicada."
          />
        </div>
        {newPhoto.previewUrl && (
          <div>
            <h3>Foto nueva</h3>
            <figure className="species-photo">
              <img
                className="species-photo__image"
                src={newPhoto.previewUrl}
                alt={`Vista previa de la nueva foto de ${commonName}`}
              />
            </figure>
            <Button type="button" variant="secondary" onClick={onClearPhoto}>
              Quitar foto nueva
            </Button>
          </div>
        )}
      </div>
      <div className="arca-field">
        <label className="arca-field__label" htmlFor={id("photo")}>
          Cambiar foto
        </label>
        <input
          id={id("photo")}
          type="file"
          accept={PHOTO_ACCEPT_ATTRIBUTE}
          aria-describedby={`${id("photo")}-help`}
          aria-invalid={photoError ? true : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];

            event.target.value = "";
            if (file) onChoosePhoto(file);
          }}
        />
        <span className="arca-field__hint" id={`${id("photo")}-help`}>
          JPG o PNG · máximo 5 MB
        </span>
        {photoError && (
          <p className="field-error" role="alert">
            {photoError}
          </p>
        )}
      </div>

      {error && (
        <Alert className="inline-alert" role="alert" aria-live="assertive">
          {error}
        </Alert>
      )}
      <div className="species-form__actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
