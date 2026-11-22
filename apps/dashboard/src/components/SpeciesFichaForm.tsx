import type { FormEvent } from "react";
import { Button, Field, SelectField } from "@arca/ui";
import { ActionError } from "./DashboardNotifications";
import { FieldErrors, fieldErrorProps, type FieldErrorMap } from "./FieldErrors";
import { ImageUploadBox } from "./ImageUploadBox";
import { SpeciesPhoto } from "./SpeciesPhoto";
import type { SpeciesFichaField } from "@/viewmodels/admin-types";
import {
  EMPTY_CORRECTION_HINT,
  FUN_FACT_HELP,
  FUN_FACT_MAX,
  PHOTO_ACCEPT_ATTRIBUTE,
  PHOTO_HELP_TEXT,
  categoryLabels,
  categoryOptions,
  fichaFieldOptions,
  funFactLabel,
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

      <div className="form-field species-form__fun-fact">
        <label className="arca-field__label" htmlFor={id("fun_fact")}>
          {funFactLabel}
          {draft.published_fields.includes("fun_fact") && <span aria-hidden="true"> *</span>}
        </label>
        <textarea
          id={id("fun_fact")}
          name="fun_fact"
          className="arca-field__control species-form__textarea"
          rows={4}
          value={draft.fun_fact}
          aria-required={draft.published_fields.includes("fun_fact") || undefined}
          aria-invalid={(fieldErrors.fun_fact ?? []).length > 0 ? true : undefined}
          aria-describedby={[
            `${id("fun_fact")}-help`,
            `${id("fun_fact")}-count`,
            (fieldErrors.fun_fact ?? []).length > 0 ? `${id("fun_fact")}-error` : "",
          ]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => onChange({ fun_fact: event.target.value })}
        />
        <span className="arca-field__hint" id={`${id("fun_fact")}-help`}>
          {FUN_FACT_HELP}
        </span>
        <span
          className="species-form__counter"
          id={`${id("fun_fact")}-count`}
          aria-live="polite"
        >
          {Array.from(draft.fun_fact).length}/{FUN_FACT_MAX}
        </span>
        <FieldErrors id={id("fun_fact")} errors={fieldErrors} name="fun_fact" />
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
      </div>
      <ImageUploadBox
        id={id("photo")}
        previewUrl={newPhoto.previewUrl}
        previewAlt={`Vista previa de la nueva foto de ${commonName}`}
        error={photoError}
        accept={PHOTO_ACCEPT_ATTRIBUTE}
        helpText={PHOTO_HELP_TEXT}
        emptyLabel="Elegir imagen"
        changeLabel="Cambiar imagen"
        removeLabel="Quitar imagen nueva"
        onSelect={onChoosePhoto}
        onRemove={onClearPhoto}
      />

      {/* dashboard-020 CA-28: error general de guardado como aviso; los de campo siguen en su campo. */}
      <ActionError message={error ?? ""} />
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
