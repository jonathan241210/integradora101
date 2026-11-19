import { Button } from '@arca/ui';
import type { SelectableSpeciesDto } from '@arca/api-client';
import {
  FORBIDDEN_MESSAGE,
  isSelectable,
  lastRejectionNotice,
  speciesStatusLabel,
} from '@/viewmodels/speciesRequestForm';
import type { SelectorStatus } from '@/viewmodels/useSpeciesSelector';

export type SpeciesSelectorFieldProps = {
  status: SelectorStatus;
  species: SelectableSpeciesDto[];
  selectedId: number | null;
  error?: string;
  onSelect: (id: number) => void;
  onRetry: () => void;
};

/** Lista de opciones tipo radio (CA-13). La elegibilidad la decide la API (RN-07). */
export function SpeciesSelectorField({
  status,
  species,
  selectedId,
  error,
  onSelect,
  onRetry,
}: SpeciesSelectorFieldProps) {
  if (status === 'loading') {
    return <p role="status">Cargando especies…</p>;
  }
  if (status === 'forbidden') {
    return <p role="alert">{FORBIDDEN_MESSAGE}</p>;
  }
  if (status === 'error') {
    return (
      <div role="alert" className="species-selector__error">
        <p>No pudimos cargar las especies. Inténtalo más tarde.</p>
        <Button type="button" variant="secondary" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }
  if (status === 'empty') {
    return <p>Aún no hay especies registradas. Regístralas primero con un animal.</p>;
  }

  return (
    <fieldset
      className="species-selector"
      id="species_id"
      tabIndex={-1}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error ? 'species_id-error' : undefined}
    >
      <legend>Especie</legend>
      {species.map((item) => {
        const notice = lastRejectionNotice(item);
        const selectable = isSelectable(item);
        return (
          <label
            className={`species-option${selectable ? '' : ' species-option--disabled'}`}
            key={item.id}
          >
            <input
              type="radio"
              name="species_id"
              value={item.id}
              checked={selectedId === item.id}
              disabled={!selectable}
              onChange={() => onSelect(item.id)}
            />
            <span className="species-option__body">
              <span className="species-option__name">{item.common_name}</span>
              <span className="species-option__status">{speciesStatusLabel(item.publication_status)}</span>
              {notice && <span className="species-option__notice">{notice}</span>}
            </span>
          </label>
        );
      })}
      {error && <span className="field-error" id="species_id-error">{error}</span>}
    </fieldset>
  );
}
