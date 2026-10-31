import { SelectField } from '@arca/ui';
import { useAnimals } from '@/viewmodels/useApiData';

type AnimalPickerProps = {
  className?: string;
  label?: string;
  name?: string;
};

export function AnimalPicker({
  className,
  label = 'Animal',
  name = 'animal_id',
}: AnimalPickerProps) {
  const { animals, loading, error } = useAnimals();

  return (
    <div className={className}>
      <SelectField defaultValue="" label={label} name={name} required>
        <option disabled value="">
          {loading ? 'Cargando animales…' : 'Seleccionar animal'}
        </option>
        {animals.map((animal) => (
          <option key={animal.id} value={animal.id}>
            {animal.name} · {animal.species ?? 'Sin especie'} · {animal.tag_number}
          </option>
        ))}
      </SelectField>
      {error && <p role="alert">{error}</p>}
      {!loading && !error && animals.length === 0 && (
        <p>Aún no hay animales. Registra uno primero.</p>
      )}
    </div>
  );
}
