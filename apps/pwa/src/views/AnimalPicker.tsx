import { SelectField } from '@arca/ui';
import type { AnimalSummary } from '@/services/apiClient';
import { useAnimals } from '@/viewmodels/useApiData';
import { Spinner } from '@/views/Spinner';

type AnimalPickerProps = {
  className?: string;
  label?: string;
  name?: string;
  onSelect?: (animal: AnimalSummary | null) => void;
};

export function AnimalPicker({
  className,
  label = 'Animal',
  name = 'animal_id',
  onSelect,
}: AnimalPickerProps) {
  const { animals, loading, error } = useAnimals();

  return (
    <div className={className}>
      <SelectField
        defaultValue=""
        label={label}
        name={name}
        required
        onChange={(event) => {
          const id = Number(event.target.value);
          const selected = Number.isFinite(id) ? animals.find((animal) => animal.id === id) ?? null : null;
          onSelect?.(selected);
        }}
      >
        <option disabled value="">
          {loading ? 'Cargando animales…' : 'Seleccionar animal'}
        </option>
        {animals.map((animal) => (
          <option key={animal.id} value={animal.id}>
            {animal.name} · {animal.species ?? 'Sin especie'} · {animal.tag_number}
          </option>
        ))}
      </SelectField>
      {loading && <Spinner label="Cargando…" />}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && animals.length === 0 && (
        <p>Aún no hay animales. Registra uno primero.</p>
      )}
    </div>
  );
}
