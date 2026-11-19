import type { SelectableSpeciesDto, SpeciesFichaField } from '@arca/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { veterinarianApi } from '@/services/veterinarianApi';
import {
  draftFromSpecies,
  emptyDraft,
  firstErrorField,
  needsChangeConfirmation,
  validatePhoto,
  type FieldErrors,
  type SpeciesRequestDraft,
} from '@/viewmodels/speciesRequestForm';
import { submitSpeciesRequest } from '@/viewmodels/speciesRequestSubmit';

export function useSpeciesRequestForm(species: SelectableSpeciesDto[], reloadSelector: () => void) {
  const [draft, setDraft] = useState<SpeciesRequestDraft>(emptyDraft);
  const [baseline, setBaseline] = useState<SpeciesRequestDraft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingSpeciesId, setPendingSpeciesId] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ field: string; nonce: number } | null>(null);
  const [resets, setResets] = useState(0);
  const focusNonce = useRef(0);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Vista previa local de la foto elegida; se libera al cambiar o desmontar.
  useEffect(() => {
    if (!draft.image) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(draft.image);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft.image]);

  const selected = species.find((item) => item.id === draft.speciesId) ?? null;
  const pendingSpecies = species.find((item) => item.id === pendingSpeciesId) ?? null;

  const applySpecies = useCallback((item: SelectableSpeciesDto) => {
    const next = draftFromSpecies(item);
    setDraft(next);
    setBaseline(next);
    setErrors({});
    setGeneral('');
    setNotice('');
    setPendingSpeciesId(null);
  }, []);

  function selectSpecies(id: number) {
    const item = species.find((candidate) => candidate.id === id);
    if (!item || id === draft.speciesId) return;
    if (needsChangeConfirmation(draft, baseline)) setPendingSpeciesId(id);
    else applySpecies(item);
  }

  function confirmChange() {
    if (pendingSpecies) applySpecies(pendingSpecies);
  }

  function cancelChange() {
    setPendingSpeciesId(null);
  }

  function setField(patch: Partial<SpeciesRequestDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors((current) => {
      const next = { ...current };
      if ('category' in patch) delete next.category;
      if ('scientific_name' in patch) delete next.scientific_name;
      if ('habitat' in patch) delete next.habitat;
      if ('origin' in patch) delete next.origin;
      if ('publishedFields' in patch) delete next.published_fields;
      return next;
    });
  }

  function toggleField(key: SpeciesFichaField) {
    setField({
      publishedFields: draft.publishedFields.includes(key)
        ? draft.publishedFields.filter((value) => value !== key)
        : [...draft.publishedFields, key],
    });
  }

  function reset() {
    setDraft(emptyDraft);
    setBaseline(null);
    setErrors({});
    setGeneral('');
    setNotice('');
    setPendingSpeciesId(null);
    setResets((count) => count + 1);
  }

  function setImage(file: File | null) {
    // Al quitar la foto se remonta el input para vaciar el archivo mostrado.
    if (!file) setResets((count) => count + 1);
    setDraft((current) => ({ ...current, image: file }));
    setErrors((current) => ({
      ...current,
      image: file ? (validatePhoto(file, draft.requestType) ?? undefined) : undefined,
    }));
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    setNotice('');
    setGeneral('');
    const outcome = await submitSpeciesRequest(veterinarianApi, draft, selected);
    setBusy(false);

    if (outcome.kind === 'created') {
      setDraft(emptyDraft);
      setResets((count) => count + 1);
      setBaseline(null);
      setErrors({});
      setNotice(outcome.notice);
      reloadSelector();
      return;
    }
    if (outcome.kind === 'invalid') {
      setErrors(outcome.errors);
      setGeneral(outcome.general);
      const field = firstErrorField(outcome.errors);
      if (field) setFocusRequest({ field, nonce: ++focusNonce.current });
      if (outcome.reloadSelector) reloadSelector();
      return;
    }
    if (outcome.kind === 'forbidden' || outcome.kind === 'failed') setGeneral(outcome.message);
    // 'session': el cliente HTTP ya llevó a inicio de sesión.
  }

  return {
    draft,
    selected,
    errors,
    general,
    notice,
    busy,
    focusRequest,
    clearFocus: () => setFocusRequest(null),
    photoKey: `${draft.speciesId ?? 'none'}-${resets}`,
    pendingSpecies,
    selectSpecies,
    confirmChange,
    cancelChange,
    setField,
    reset,
    photoPreview,
    toggleField,
    setImage,
    submit,
  };
}
