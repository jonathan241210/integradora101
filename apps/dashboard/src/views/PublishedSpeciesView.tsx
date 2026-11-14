import { Alert, Button, Card, SelectField } from "@arca/ui";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { HasMorePaginationBar } from "@/components/HasMorePaginationBar";
import { ListStatusMessage } from "@/components/ListStatusMessage";
import { PendingRequestNotice } from "@/components/PendingRequestNotice";
import { NoticeBar } from "@/components/NoticeBar";
import { SectionHeading } from "@/components/SectionHeading";
import { SpeciesPhoto } from "@/components/SpeciesPhoto";
import { SpeciesStatusBadge } from "@/components/SpeciesStatusBadge";
import type { PublishedSpeciesRowDto, SpeciesCategory } from "@/viewmodels/admin-types";
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
} from "@/viewmodels/species-publication-shared";
import { PublishedSpeciesDetailView } from "./PublishedSpeciesDetailView";

/** Lista de especies publicadas y despublicadas (CA-51, CA-52) o, con una abierta, su detalle. */
export function PublishedSpeciesView(
  viewModel: PublishedSpeciesViewModel & { onOpenRequests?: () => void },
) {
  const { state, actions, onOpenRequests } = viewModel;

  if (state.selectedId !== null) return <PublishedSpeciesDetailView {...viewModel} />;

  const { list } = state;
  const columns: DataTableColumn<PublishedSpeciesRowDto>[] = [
    {
      key: "photo",
      header: "Foto",
      render: (row) => (
        <SpeciesPhoto
          slot={state.thumbs[row.id] ?? { status: "idle", url: "" }}
          alt={`Foto de ${row.common_name}`}
          noneText="Sin foto"
        />
      ),
    },
    {
      key: "species",
      header: "Especie",
      render: (row) => (
        <>
          <strong>{row.common_name}</strong>
          {row.scientific_name && <span className="species-row__sub">{row.scientific_name}</span>}
        </>
      ),
    },
    { key: "category", header: "Tipo de animal", render: (row) => categoryLabel(row.category) },
    {
      key: "date",
      header: "Publicada el",
      render: (row) => (row.published_at ? formatDateTime(row.published_at) : "—"),
    },
    {
      key: "status",
      header: "Estado",
      render: (row) => (
        <>
          <SpeciesStatusBadge status={row.status} />
          {row.has_pending_request && <span className="species-tag">Solicitud pendiente</span>}
        </>
      ),
    },
    {
      key: "action",
      header: "Acción",
      render: (row) => (
        <>
          <Button variant="secondary" onClick={() => actions.open(row.id)}>
            Revisar
          </Button>
          {row.has_pending_request && (
            <>
              <Button variant="secondary" disabled>
                Editar
              </Button>
              <Button variant="secondary" disabled>
                Republicar
              </Button>
              <PendingRequestNotice message={pendingRequestNotice} onOpenRequests={onOpenRequests} />
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <>
      <SectionHeading
        eyebrow="Publicación de especies"
        title="Especies publicadas"
        description="Gestiona la publicación de las especies en TulanPedia."
      />
      <NoticeBar message={state.notice} onDismiss={actions.dismissNotice} />

      {list.forbidden ? (
        <Alert role="alert" aria-live="assertive">
          {list.error}
        </Alert>
      ) : (
        <>
          <Card className="filter-card">
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
          </Card>
          <Card className="table-card">
            <ListStatusMessage
              status={list.status}
              error={list.error}
              loadingText="Cargando especies…"
              emptyText="No hay especies con este estado."
              onRetry={actions.reload}
            />
            {list.status === "ready" && (
              <>
                <DataTable
                  caption="Especies publicadas"
                  columns={columns}
                  rows={list.items}
                  rowKey={(row) => row.id}
                />
                <HasMorePaginationBar
                  page={state.page}
                  hasMore={list.hasMore}
                  onPageChange={actions.goToPage}
                />
              </>
            )}
            {list.status === "empty" && state.page > 1 && (
              <HasMorePaginationBar page={state.page} hasMore={false} onPageChange={actions.goToPage} />
            )}
          </Card>
        </>
      )}
    </>
  );
}
