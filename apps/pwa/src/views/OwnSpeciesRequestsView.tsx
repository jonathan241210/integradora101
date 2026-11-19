import { Button, Card } from '@arca/ui';
import type { OwnSpeciesRequestDto } from '@arca/api-client';
import {
  FORBIDDEN_MESSAGE,
  formatDate,
  requestStatusLabel,
  requestTypeLabel,
} from '@/viewmodels/speciesRequestForm';
import { useOwnSpeciesRequests, type OwnRequestsStatus } from '@/viewmodels/useOwnSpeciesRequests';

export type OwnSpeciesRequestsPresenterProps = {
  status: OwnRequestsStatus;
  requests: OwnSpeciesRequestDto[];
  hasMore: boolean;
  page: number;
  onRetry: () => void;
  onNext: () => void;
  onPrevious: () => void;
};

export function OwnSpeciesRequestsPresenter({
  status,
  requests,
  hasMore,
  page,
  onRetry,
  onNext,
  onPrevious,
}: OwnSpeciesRequestsPresenterProps) {
  if (status === 'loading') return <p role="status">Cargando tus solicitudes…</p>;
  if (status === 'forbidden') return <p role="alert">{FORBIDDEN_MESSAGE}</p>;
  if (status === 'error') {
    return (
      <div role="alert">
        <p>No pudimos cargar tus solicitudes. Inténtalo más tarde.</p>
        <Button type="button" variant="secondary" onClick={onRetry}>Reintentar</Button>
      </div>
    );
  }
  if (status === 'empty' && page === 1) return <p>Aún no has enviado solicitudes.</p>;

  return (
    <div className="own-requests">
      <ul className="own-requests__list">
        {requests.map((request) => (
          <li key={request.id}>
            <Card className="own-request">
              <h3>
                {request.common_name}
                {request.species_publication_status === 'unpublished' && (
                  <span className="own-request__flag"> Despublicada</span>
                )}
              </h3>
              <p>{requestTypeLabel(request.request_type)}</p>
              <p><strong>{requestStatusLabel(request)}</strong></p>
              <p>Enviada el {formatDate(request.created_at)}</p>
              {request.reviewed_at && <p>Decisión el {formatDate(request.reviewed_at)}</p>}
              {request.status === 'rejected' && request.rejection_reason && (
                <p className="own-request__reason">Motivo: {request.rejection_reason}</p>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <div className="own-requests__pager">
        {page > 1 && <Button type="button" variant="secondary" onClick={onPrevious}>Anterior</Button>}
        {hasMore && <Button type="button" variant="secondary" onClick={onNext}>Siguiente</Button>}
      </div>
    </div>
  );
}

export function OwnSpeciesRequestsView() {
  const state = useOwnSpeciesRequests();
  return (
    <OwnSpeciesRequestsPresenter
      status={state.status}
      requests={state.requests}
      hasMore={state.hasMore}
      page={state.page}
      onRetry={state.reload}
      onNext={state.next}
      onPrevious={state.previous}
    />
  );
}
