import { Alert, Button, Card, Pagination, SelectField } from "@arca/ui";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { CardGridSkeleton } from "@/components/LoadingSkeletons";
import { PendingRequestNotice } from "@/components/PendingRequestNotice";
import { NoticeBar } from "@/components/NoticeBar";
import { Icon } from "@/components/Icon";
import { SpeciesStatusBadge } from "@/components/SpeciesStatusBadge";
import type { PublishedSpeciesRowDto, SpeciesCategory } from "@/viewmodels/admin-types";
import type { PhotoSlot } from "@/viewmodels/species-requests";
import { formatDateTime } from "@/viewmodels/formatters";
import {
  pendingRequestNotice,
  publishedStatusOptions,
  type PublishedSpeciesViewModel,
  type PublishedStatusFilter,
} from "@/viewmodels/published-species";
import {
  categoryLabel,
  categoryLabels,
  categoryOptions,
  PHOTO_LOAD_ERROR,
} from "@/viewmodels/species-publication-shared";
import { PublishedSpeciesDetailView } from "./PublishedSpeciesDetailView";

/** Foto de la tarjeta con proporción fija; sin foto, marcador con icono (dashboard-010 CA-75). */
function SpeciesCardMedia({ photo, name }: { photo: PhotoSlot; name: string }) {
  if (photo.status === "ready") {
    return <img className="species-card__image" src={photo.url} alt={`Foto de ${name}`} />;
  }

  const text =
    photo.status === "none"
      ? "Sin foto"
      : photo.status === "error"
        ? PHOTO_LOAD_ERROR
        : "Cargando foto…";

  return (
    <div
      className="species-card__placeholder"
      role={photo.status === "error" ? "alert" : photo.status === "none" ? undefined : "status"}
    >
      <Icon name="animals" width={36} height={36} />
      <span>{text}</span>
    </div>
  );
}

/** Tarjeta de una especie publicada o despublicada; solo presenta lo que entrega la API. */
function SpeciesCard({
  row,
  photo,
  onOpen,
  onOpenRequests,
}: {
  row: PublishedSpeciesRowDto;
  photo: PhotoSlot;
  onOpen: () => void;
  onOpenRequests?: () => void;
}) {
  return (
    <article className="species-card">
      <div className="species-card__media">
        <SpeciesCardMedia photo={photo} name={row.common_name} />
      </div>
      <div className="species-card__body">
        <h3 className="species-card__title">{row.common_name}</h3>
        {row.scientific_name && <p className="species-card__scientific">{row.scientific_name}</p>}
        <p className="species-cell">
          <SpeciesStatusBadge status={row.status} />
          {row.has_pending_request && <span className="species-tag">Solicitud pendiente</span>}
        </p>
        <dl className="species-card__meta">
          <div>
            <dt>Tipo de animal</dt>
            <dd>{categoryLabel(row.category)}</dd>
          </div>
          <div>
            <dt>Publicada el</dt>
            <dd>{row.published_at ? formatDateTime(row.published_at) : "—"}</dd>
          </div>
        </dl>
      </div>
      {row.has_pending_request && (
        <div className="species-card__notice">
          <PendingRequestNotice message={pendingRequestNotice} onOpenRequests={onOpenRequests} />
        </div>
      )}
      <div className="species-card__footer">
        <div className="row-actions">
          <Button
            variant="secondary"
            aria-label={`Revisar especie ${row.common_name}`}
            onClick={onOpen}
          >
            Revisar
          </Button>
          {row.has_pending_request && (
            <>
              <Button variant="secondary" disabled aria-label={`Editar especie ${row.common_name}`}>
                Editar
              </Button>
              <Button variant="secondary" disabled aria-label={`Republicar especie ${row.common_name}`}>
                Republicar
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/** Lista de especies publicadas y despublicadas (CA-51, CA-52, CA-75) o, con una abierta, su detalle. */
export function PublishedSpeciesView(
  viewModel: PublishedSpeciesViewModel & { onOpenRequests?: () => void },
) {
  const { state, actions, onOpenRequests } = viewModel;

  if (state.selectedId !== null) return <PublishedSpeciesDetailView {...viewModel} />;

  const { list } = state;

  return (
    <>
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      {list.forbidden ? (
        <Alert role="alert" aria-live="assertive">
          {list.error}
        </Alert>
      ) : (
        <>
          <Card className="filter-card">
            <form className="filter-form filter-form--species" onSubmit={(event) => event.preventDefault()}>
            <SelectField
              id="published-species-status"
              name="status"
              label="Estado"
              value={state.statusFilter}
              onChange={(event) => actions.changeStatus(event.target.value as PublishedStatusFilter)}
            >
              {publishedStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
            <SelectField
              id="published-species-category"
              name="category"
              label="Tipo de animal"
              value={state.category}
              onChange={(event) => actions.changeCategory(event.target.value as "" | SpeciesCategory)}
            >
              <option value="">Todos los tipos</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </SelectField>
            </form>
          </Card>
          <Card className="species-grid-card">
            {list.status === "empty" && (
              <div className="species-empty">
                <Icon name="animals" width={40} height={40} />
                <p className="state-message">No hay especies con este estado.</p>
              </div>
            )}
            <ListStatusMessage
              status={list.status === "empty" ? "ready" : list.status}
              error={list.error}
              loadingText="Cargando especies…"
              skeleton={<CardGridSkeleton kind="species" label="Cargando especies…" />}
              emptyText="No hay especies con este estado."
              onRetry={actions.reload}
            />
            {list.status === "ready" && (
              <>
                <ul className="species-grid" aria-label="Especies publicadas">
                  {list.items.map((row) => (
                    <li key={row.id} data-search-id={`tulanpedia:published-species:${row.id}`}>
                      <SpeciesCard
                        row={row}
                        photo={state.thumbs[row.id] ?? { status: "idle", url: "" }}
                        onOpen={() => actions.open(row.id)}
                        onOpenRequests={onOpenRequests}
                      />
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={state.page}
                  lastPage={list.lastPage}
                  total={list.total}
                  onPageChange={actions.goToPage}
                />
              </>
            )}
            {list.status === "empty" && state.page > 1 && (
              <Pagination
                page={state.page}
                lastPage={list.lastPage}
                total={list.total}
                onPageChange={actions.goToPage}
              />
            )}
          </Card>
        </>
      )}
    </>
  );
}
