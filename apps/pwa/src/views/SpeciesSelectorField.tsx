import { Button, SelectField } from '@arca/ui';
import type { SelectableSpeciesDto } from '@arca/api-client';
import {
  FORBIDDEN_MESSAGE,
  isSelectable,
  speciesOptionLabel,
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

/** Desplegable de especies (CA-13). La elegibilidad la decide la API (RN-07). */
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
    <div className="species-selector">
      <SelectField
        label="Especie"
        name="species_id"
        id="species_id"
        value={selectedId === null ? '' : String(selectedId)}
        onChange={(event) => {
          if (event.target.value) onSelect(Number(event.target.value));
        }}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? 'species_id-error' : undefined}
      >
        <option value="">Selecciona una especie</option>
        {species.map((item) => (
          <option key={item.id} value={item.id} disabled={!isSelectable(item)}>
            {speciesOptionLabel(item)}
          </option>
        ))}
      </SelectField>
      {error && <span className="field-error" id="species_id-error">{error}</span>}
    </div>
  );
}
