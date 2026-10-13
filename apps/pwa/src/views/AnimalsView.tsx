import { Badge, Card, Field } from '@arca/ui';

const animals = [
  { name: 'Luna', species: 'Lobo mexicano', group: 'Mamíferos', status: 'En tratamiento', tone: 'warning' as const },
  { name: 'Tláloc', species: 'Jaguar', group: 'Mamíferos', status: 'Saludable', tone: 'success' as const },
  { name: 'Cuahtli', species: 'Águila real', group: 'Aves', status: 'En revisión', tone: 'info' as const },
  { name: 'Chuy', species: 'Tapir de Baird', group: 'Mamíferos', status: 'Saludable', tone: 'success' as const },
  { name: 'Coco', species: 'Mono araña', group: 'Primates', status: 'En tratamiento', tone: 'warning' as const },
  { name: 'Nahual', species: 'Ocelote', group: 'Mamíferos', status: 'En revisión', tone: 'info' as const },
];

export function AnimalsView() {
  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Directorio</p>
        <h2>Animales</h2>
        <p>Listado ficticio para recorrer la interfaz.</p>
      </div>

      <Card className="animals-card">
        <div className="animals-toolbar">
          <Field
            aria-label="Buscar animal de muestra"
            label="Buscar"
            name="animal-search"
            placeholder="Nombre o especie"
            type="search"
          />
          <span className="sample-count">6 animales de muestra</span>
        </div>
        <div className="animal-list" role="list" aria-label="Animales de muestra">
          {animals.map((animal) => (
            <article className="animal-row" key={animal.name} role="listitem">
              <span className="animal-avatar" aria-hidden="true">
                {animal.name.slice(0, 1)}
              </span>
              <div className="animal-details">
                <strong>{animal.name}</strong>
                <span>{animal.species} · {animal.group}</span>
              </div>
              <Badge tone={animal.tone}>{animal.status}</Badge>
              <span className="sample-tag">Dato ficticio</span>
            </article>
          ))}
        </div>
      </Card>
    </section>
  );
}
