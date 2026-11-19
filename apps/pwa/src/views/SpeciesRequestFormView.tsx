import { Button, Dialog } from '@arca/ui';
import { useEffect } from 'react';
import { useSpeciesRequestForm } from '@/viewmodels/useSpeciesRequestForm';
import { useSpeciesSelector } from '@/viewmodels/useSpeciesSelector';
import { SpeciesRequestFormPresenter } from '@/views/SpeciesRequestFormPresenter';

export function SpeciesRequestFormView() {
  const selector = useSpeciesSelector();
  const form = useSpeciesRequestForm(selector.species, selector.reload);

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
        onChange={form.setField}
        onToggleField={form.toggleField}
        onImage={form.setImage}
        onSubmit={() => void form.submit()}
      />
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
