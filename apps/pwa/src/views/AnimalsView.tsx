import { Badge, Card, Field } from '@arca/ui';
import { useState } from 'react';
import { useAnimals } from '@/viewmodels/useApiData';

const sexLabels: Record<string, string> = {
  F: 'Hembra',
  M: 'Macho',
  I: 'No identificado',
};

export function AnimalsView() {
  const [search, setSearch] = useState('');
  const { animals, loading, error, reload } = useAnimals(search);

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Directorio</p>
        <h2>Animales</h2>
        <p>Ejemplares registrados en el sistema.</p>
      </div>

      <Card className="animals-card">
        <div className="animals-toolbar">
          <Field
            aria-label="Buscar animal"
            label="Buscar"
            name="animal-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, especie o identificación"
            type="search"
            value={search}
          />
          <span className="sample-count">
            {loading ? 'Cargando…' : `${animals.length} animales`}
          </span>
        </div>
        {error && (
          <p role="alert">
            {error}{' '}
            <button onClick={reload} type="button">Reintentar</button>
          </p>
        )}
        {!loading && !error && animals.length === 0 && (
          <p>No hay animales que coincidan. Usa «Registrar animal» para agregar uno.</p>
        )}
        <div className="animal-list" role="list" aria-label="Animales registrados">
          {animals.map((animal) => (
            <article className="animal-row" key={animal.id} role="listitem">
              <span className="animal-avatar" aria-hidden="true">
                {animal.name.slice(0, 1)}
              </span>
              <div className="animal-details">
                <strong>{animal.name}</strong>
                <span>
                  {animal.species ?? 'Sin especie'} · {animal.tag_number}
                </span>
              </div>
              <Badge tone="info">{sexLabels[animal.sex] ?? animal.sex}</Badge>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
