import { SelectField } from '@arca/ui';
import { useEffect, useState } from 'react';
import type { AnimalSummary } from '@/services/apiClient';
import { useAnimals } from '@/viewmodels/useApiData';
import { offlineDb } from '@/offline/db';
import { Spinner } from '@/views/Spinner';

export type PickableAnimal = AnimalSummary & { localId?: string; pendingLocal?: boolean };

type AnimalPickerProps = {
  className?: string;
  label?: string;
  name?: string;
  userScope?: string;
  onSelect?: (animal: PickableAnimal | null) => void;
};

export function AnimalPicker({
  className,
  label = 'Animal',
  name = 'animal_id',
  userScope,
  onSelect,
}: AnimalPickerProps) {
  const { animals, loading, error } = useAnimals('', userScope);
  const [localAnimals, setLocalAnimals] = useState<PickableAnimal[]>([]);

  useEffect(() => {
    if (!userScope) return;
    let cancelled = false;
    void offlineDb.localAnimals
      .where('userScope')
      .equals(userScope)
      .toArray()
      .then((items) => {
        if (cancelled) return;
        const pending = items
          .filter((item) => item.status !== 'synced')
          .map((item) => ({
            id: -1,
            tag_number: item.tagNumber,
            name: item.name,
            sex: item.sex,
            birth_date: item.birthDate ?? null,
            stay_status: 'pending_local',
            species: item.speciesName ?? null,
            localId: item.localId,
            pendingLocal: true,
          }));
        setLocalAnimals(pending);
      })
      .catch(() => {
        if (!cancelled) setLocalAnimals([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userScope, animals]);

  const options: Array<{ value: string; label: string; animal: PickableAnimal }> = [
    ...localAnimals.map((animal) => ({
      value: `local:${animal.localId}`,
      label: `${animal.name} · ${animal.species ?? 'Sin especie'} · ${animal.tag_number} (pendiente local)`,
      animal,
    })),
    ...animals.map((animal) => ({
      value: `server:${animal.id}`,
      label: `${animal.name} · ${animal.species ?? 'Sin especie'} · ${animal.tag_number}`,
      animal: animal as PickableAnimal,
    })),
  ];

  return (
    <div className={className}>
      <SelectField
        defaultValue=""
        label={label}
        name={name}
        required
        onChange={(event) => {
          const selected = options.find((option) => option.value === event.target.value)?.animal ?? null;
          onSelect?.(selected);
        }}
      >
        <option disabled value="">
          {loading ? 'Cargando animales…' : 'Seleccionar animal'}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectField>
      {loading && <Spinner label="Cargando animales…" />}
      {error && <p role="alert">{error}</p>}
      {!loading && !error && options.length === 0 && (
        <p>Aún no hay animales. Registra uno primero.</p>
      )}
    </div>
  );
}
