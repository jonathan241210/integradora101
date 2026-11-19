import { Button } from '@arca/ui';
import { useState } from 'react';
import { OwnSpeciesRequestsView } from '@/views/OwnSpeciesRequestsView';
import { SpeciesRequestFormView } from '@/views/SpeciesRequestFormView';

type Tab = 'form' | 'mine';

export function SpeciesRequestView() {
  const [tab, setTab] = useState<Tab>('form');

  return (
    <section className="page-section">
      <div className="page-intro">
        <p className="eyebrow">Catálogo público</p>
        <h2>Solicitar publicación de especie</h2>
        <p>Elige una especie registrada y propón su publicación o su actualización. La Dirección la revisa antes de publicarla.</p>
      </div>
      <div className="species-request-tabs" role="group" aria-label="Secciones de solicitudes">
        <Button
          type="button"
          variant={tab === 'form' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'form'}
          onClick={() => setTab('form')}
        >
          Solicitar publicación
        </Button>
        <Button
          type="button"
          variant={tab === 'mine' ? 'primary' : 'secondary'}
          aria-pressed={tab === 'mine'}
          onClick={() => setTab('mine')}
        >
          Mis solicitudes
        </Button>
      </div>
      {tab === 'form' ? <SpeciesRequestFormView /> : <OwnSpeciesRequestsView />}
    </section>
  );
}
