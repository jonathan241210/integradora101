import { Spinner } from '@/views/Spinner';
import { Alert, Badge, Button, Pagination } from '@arca/ui';
import type { OwnSpeciesRequestDto } from '@arca/api-client';
import {
  FORBIDDEN_MESSAGE,
  formatDate,
  requestStatusLabel,
  requestStatusTone,
  requestTypeLabel,
} from '@/viewmodels/speciesRequestForm';
import { useOwnSpeciesRequests, type OwnRequestsStatus } from '@/viewmodels/useOwnSpeciesRequests';

export type OwnSpeciesRequestsPresenterProps = {
  status: OwnRequestsStatus;
  requests: OwnSpeciesRequestDto[];
  hasMore: boolean;
  page: number;
  /** Última página y total de `meta` (api-014 rev. 2026-11-21); sin ellos se usa solo `hasMore`. */
  lastPage?: number;
  total?: number;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onRequestNew?: () => void;
  onResubmit?: (speciesId: number) => void;
};

function DateText({ value }: { value: string | null }) {
  return <time dateTime={value ?? undefined}>{formatDate(value)}</time>;
}

export function OwnSpeciesRequestsPresenter({
  status,
  requests,
  hasMore,
  page,
  lastPage,
  total,
  onRetry,
  onPageChange,
  onRequestNew,
  onResubmit,
}: OwnSpeciesRequestsPresenterProps) {
  if (status === 'loading') return <Spinner label="Cargando tus solicitudes…" />;
  if (status === 'forbidden') return <p role="alert">{FORBIDDEN_MESSAGE}</p>;
  if (status === 'error') {
    return (
      <Alert role="alert" className="own-requests__error">
        <p>No pudimos cargar tus solicitudes. Inténtalo más tarde.</p>
        <Button type="button" variant="secondary" onClick={onRetry}>Reintentar</Button>
      </Alert>
    );
  }
  if (status === 'empty' && page === 1) {
    return (
      <div className="own-requests__empty">
        <p>Aún no has enviado solicitudes.</p>
        <Button type="button" onClick={onRequestNew}>Solicitar publicación</Button>
      </div>
    );
  }

  return (
    <div className="own-requests">
      <ul className="own-requests__list">
        {requests.map((request) => (
          <li key={request.id}>
            <article className="own-request">
              <div className="own-request__row own-request__head">
                <h3>{request.common_name}</h3>
                <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request)}</Badge>
              </div>
              <div className="own-request__row">
                <span className="own-request__type">{requestTypeLabel(request.request_type)}</span>
                {request.species_publication_status === 'unpublished' && (
                  <Badge tone="warning">Despublicada</Badge>
                )}
              </div>
              <p className="own-request__meta">
                Enviada <DateText value={request.created_at} />
                {request.reviewed_at && (
                  <>
                    {' · '}Decisión <DateText value={request.reviewed_at} />
                  </>
                )}
              </p>
              {request.status === 'rejected' && request.rejection_reason && (
                <Alert role="note" className="species-summary__notice own-request__reason">
                  <strong>Motivo del rechazo</strong>
                  <p>{request.rejection_reason}</p>
                </Alert>
              )}
              {request.status === 'rejected' && (
                <div className="own-request__actions">
                  <Button type="button" variant="secondary" onClick={() => onResubmit?.(request.species_id)}>
                    Enviar de nuevo
                  </Button>
                </div>
              )}
            </article>
          </li>
        ))}
      </ul>
      {(page > 1 || hasMore || (lastPage ?? 1) > 1) &&
        (lastPage !== undefined && total !== undefined ? (
          <Pagination page={page} lastPage={lastPage} total={total} onPageChange={onPageChange} />
        ) : (
          <Pagination page={page} hasMore={hasMore} onPageChange={onPageChange} />
        ))}
    </div>
  );
}

export function OwnSpeciesRequestsView({
  onRequestNew,
  onResubmit,
}: Pick<OwnSpeciesRequestsPresenterProps, 'onRequestNew' | 'onResubmit'>) {
  const state = useOwnSpeciesRequests();
  return (
    <OwnSpeciesRequestsPresenter
      status={state.status}
      requests={state.requests}
      hasMore={state.hasMore}
      page={state.page}
      lastPage={state.lastPage}
      total={state.total}
      onRetry={state.reload}
      onPageChange={state.goToPage}
      onRequestNew={onRequestNew}
      onResubmit={onResubmit}
    />
  );
}
