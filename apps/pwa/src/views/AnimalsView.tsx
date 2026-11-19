import { Badge, Button, Card, Field } from '@arca/ui';
import { useEffect, useMemo, useState } from 'react';
import { useAnimals } from '@/viewmodels/useApiData';
import { Spinner } from '@/views/Spinner';

const sexLabels: Record<string, string> = {
  F: 'Hembra',
  M: 'Macho',
  I: 'No identificado',
  hembra: 'Hembra',
  macho: 'Macho',
};

type SortMode = 'recent' | 'name';

export function AnimalsView({
  onOpenAnimal,
  userScope,
}: {
  onOpenAnimal?: (animalId: number) => void;
  userScope?: string;
  animalId?: number | null;
  onNavigate?: unknown;
  mvzName?: string;
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('recent');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { animals, loading, error, reload } = useAnimals(search, userScope);

  useEffect(() => {
    setPage(1);
  }, [search, sort]);

  const sorted = useMemo(() => {
    const list = [...animals];
    if (sort === 'recent') {
      list.sort((a, b) => b.id - a.id);
    } else {
      list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    }
    return list;
  }, [animals, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Directorio</p>
        <h2>Animales</h2>
        <p>Ejemplares registrados en el sistema.</p>
      </div>

      <Card className="animals-card">
        <div className="animals-toolbar" style={{ display: 'grid', gap: '0.75rem' }}>
          <Field
            aria-label="Buscar animal"
            label="Buscar"
            name="animal-search"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, especie o identificación"
            type="search"
            value={search}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>Orden</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as SortMode)} aria-label="Ordenar animales">
                <option value="recent">Más recientes creados</option>
                <option value="name">Nombre (A-Z)</option>
              </select>
            </label>
            <span className="sample-count">
              {loading ? <Spinner label="Cargando…" /> : `${sorted.length} animales`}
            </span>
          </div>
        </div>
        {error && (
          <p role="alert">
            {error}{' '}
            <button onClick={reload} type="button">Reintentar</button>
          </p>
        )}
        {!loading && !error && sorted.length === 0 && (
          <p>No hay animales que coincidan. Usa «Registrar animal» para agregar uno.</p>
        )}
        <div className="animal-list" role="list" aria-label="Animales registrados">
          {paged.map((animal) => (
            <article className="animal-row" key={animal.id} role="listitem">
              <button
                aria-label={`Ver perfil de ${animal.name}`}
                className="animal-row-button"
                onClick={() => onOpenAnimal?.(animal.id)}
                type="button"
              >
                <span className="animal-avatar" aria-hidden="true">
                  {animal.name.slice(0, 1)}
                </span>
                <span className="animal-details">
                  <strong>{animal.name}</strong>
                  <span>
                    {animal.species ?? 'Sin especie'} · {animal.tag_number}
                  </span>
                </span>
                <Badge tone="info">{sexLabels[animal.sex] ?? animal.sex}</Badge>
              </button>
            </article>
          ))}
        </div>

        {sorted.length > pageSize && (
          <div className="form-actions" style={{ justifyContent: 'center', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <Button
              type="button"
              variant="secondary"
              aria-label="Página anterior"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Anterior
            </Button>
            <span>Página {currentPage} de {totalPages}</span>
            <Button
              type="button"
              variant="secondary"
              aria-label="Página siguiente"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente →
            </Button>
          </div>
        )}
      </Card>
    </section>
  );
}
