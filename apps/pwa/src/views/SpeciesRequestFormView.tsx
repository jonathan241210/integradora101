import { Button, Dialog } from '@arca/ui';
import { useEffect, useRef } from 'react';
import { useSpeciesRequestForm } from '@/viewmodels/useSpeciesRequestForm';
import { useSpeciesSelector } from '@/viewmodels/useSpeciesSelector';
import { SpeciesRequestFormPresenter } from '@/views/SpeciesRequestFormPresenter';

export function SpeciesRequestFormView({ initialSpeciesId = null }: { initialSpeciesId?: number | null }) {
  const selector = useSpeciesSelector();
  const form = useSpeciesRequestForm(selector.species, selector.reload);

  // «Enviar de nuevo» (CA-22): elige la especie una sola vez cuando la lista llega.
  const applied = useRef(false);
  const { species, status } = selector;
  const { selectSpecies } = form;
  useEffect(() => {
    if (applied.current || initialSpeciesId === null || status !== 'ready') return;
    if (!species.some((item) => item.id === initialSpeciesId)) return;
    applied.current = true;
    selectSpecies(initialSpeciesId);
  }, [initialSpeciesId, status, species, selectSpecies]);

  // Foco al primer campo con error solo tras un 422 (plan, Accesibilidad).
  const { focusRequest, clearFocus } = form;
  useEffect(() => {
    if (!focusRequest) return;
    const target = document.getElementById(focusRequest.field);
    const control = target instanceof HTMLFieldSetElement
      ? target.querySelector<HTMLElement>('input:not(:disabled)') ?? target
      : target;
    control?.focus();
    clearFocus();
  }, [focusRequest, clearFocus]);

  return (
    <>
      <SpeciesRequestFormPresenter
        selector={{
          status: selector.status,
          species: selector.species,
          onSelect: form.selectSpecies,
          onRetry: selector.reload,
        }}
        selected={form.selected}
        draft={form.draft}
        errors={form.errors}
        general={form.general}
        notice={form.notice}
        busy={form.busy}
        photoKey={form.photoKey}
        photoPreview={form.photoPreview}
        onReset={form.requestReset}
        onChange={form.setField}
        onToggleField={form.toggleField}
        onImage={form.setImage}
        onSubmit={() => void form.submit()}
      />
      <Dialog
        open={form.confirmingReset}
        title="Limpiar formulario"
        onClose={form.cancelReset}
      >
        <p>Se perderán los cambios que hiciste. ¿Deseas limpiar el formulario?</p>
        <Button type="button" onClick={form.reset}>Limpiar</Button>
        <Button type="button" variant="ghost" onClick={form.cancelReset}>Conservar mis datos</Button>
      </Dialog>
      <Dialog
        open={form.pendingSpecies !== null}
        title="Cambiar de especie"
        onClose={form.cancelChange}
      >
        <p>Cambiar de especie reemplaza los datos que escribiste. ¿Deseas continuar?</p>
        <Button type="button" onClick={form.confirmChange}>Cambiar de especie</Button>
        <Button type="button" variant="ghost" onClick={form.cancelChange}>Conservar mis datos</Button>
      </Dialog>
    </>
  );
}
